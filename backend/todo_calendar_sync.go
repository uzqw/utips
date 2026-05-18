package main

import (
	"encoding/json"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

const (
	todoCalendarCollectionName = "todo_calendar_events"
	defaultTodoDue             = "0001-01-01T00:00:00+08:00"
	todoCalendarSyncDebounce   = 1500 * time.Millisecond
)

var (
	todoIDPattern   = regexp.MustCompile(`(?:^|\s)@id=([A-Za-z0-9_-]+)`)
	todoDuePattern  = regexp.MustCompile(`(?:^|\s)@due=([^\s]+)`)
	todoDescPattern = regexp.MustCompile(`(?:^|\s)@desc="((?:\\"|[^"])*)"`)

	todoCalendarScheduler = struct {
		sync.Mutex
		timers map[string]*time.Timer
		locks  map[string]*sync.Mutex
	}{
		timers: map[string]*time.Timer{},
		locks:  map[string]*sync.Mutex{},
	}
)

type todoCalendarLine struct {
	LineIndex   int
	TodoID      string
	Raw         string
	Title       string
	Description string
	Due         time.Time
	HasDue      bool
}

func registerTodoCalendarHooks(app *pocketbase.PocketBase) {
	app.OnRecordAfterCreateSuccess("diaries").BindFunc(func(e *core.RecordEvent) error {
		scheduleTodoCalendarSync(e.App, e.Record.Id)
		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess("diaries").BindFunc(func(e *core.RecordEvent) error {
		scheduleTodoCalendarSync(e.App, e.Record.Id)
		return e.Next()
	})

	app.OnRecordAfterDeleteSuccess("diaries").BindFunc(func(e *core.RecordEvent) error {
		diary := cloneRecord(e.Record.Original())
		go deleteTodoCalendarEventsForDiary(e.App, diary)
		return e.Next()
	})
}

func cloneRecord(record *core.Record) *core.Record {
	if record == nil {
		return nil
	}
	return record.Clone()
}

func scheduleTodoCalendarSync(app core.App, diaryID string) {
	if diaryID == "" {
		return
	}

	todoCalendarScheduler.Lock()
	if timer := todoCalendarScheduler.timers[diaryID]; timer != nil {
		timer.Stop()
	}
	todoCalendarScheduler.timers[diaryID] = time.AfterFunc(todoCalendarSyncDebounce, func() {
		syncTodoCalendarDiaryLatest(app, diaryID)
	})
	todoCalendarScheduler.Unlock()
}

func syncTodoCalendarDiaryLatest(app core.App, diaryID string) {
	diaryLock := todoCalendarDiaryLock(diaryID)
	diaryLock.Lock()
	defer diaryLock.Unlock()

	todoCalendarScheduler.Lock()
	delete(todoCalendarScheduler.timers, diaryID)
	todoCalendarScheduler.Unlock()

	diary, err := app.FindRecordById("diaries", diaryID)
	if err != nil {
		log.Printf("todo calendar diary lookup failed: diary=%s err=%v", diaryID, err)
		deleteTodoCalendarEventsForDiaryID(app, diaryID)
		return
	}
	syncTodoCalendarEventsFromLatest(app, diary)
}

func todoCalendarDiaryLock(diaryID string) *sync.Mutex {
	todoCalendarScheduler.Lock()
	defer todoCalendarScheduler.Unlock()
	lock := todoCalendarScheduler.locks[diaryID]
	if lock == nil {
		lock = &sync.Mutex{}
		todoCalendarScheduler.locks[diaryID] = lock
	}
	return lock
}

func syncTodoCalendarEventsFromLatest(app core.App, diary *core.Record) {
	if diary == nil {
		return
	}

	linesByID := todoLinesByID(parseTodoCalendarLines(diary.GetString("content")))
	mappings, err := findTodoCalendarEventRecordsForDiary(app, diary.Id)
	if err != nil {
		log.Printf("todo calendar mapping lookup failed: diary=%s err=%v", diary.Id, err)
		return
	}
	mappingByTodoID := todoCalendarMappingsByTodoID(mappings)
	service := googleCalendarServiceForDiaryUser(app, diary)

	for todoID, mapping := range mappingByTodoID {
		line, exists := linesByID[todoID]
		if !exists || !line.HasDue {
			deleteTodoCalendarEventRecord(app, service, mapping)
		}
	}

	for todoID, line := range linesByID {
		if !line.HasDue {
			continue
		}
		mapping := mappingByTodoID[todoID]
		if mapping != nil && todoCalendarMappingMatchesLine(mapping, line) {
			continue
		}
		if service == nil || !service.Available() {
			log.Printf("todo calendar sync skipped: user google calendar config unavailable diary=%s todoId=%s", diary.Id, todoID)
			notifyTodoCalendarFailure(app, diary.GetString("user"), diary.Id, line, "load_config", "Google Calendar 配置不可用")
			continue
		}
		upsertTodoCalendarEvent(app, service, diary, line, mapping)
	}
}

func parseTodoCalendarLines(content string) []todoCalendarLine {
	rawLines := strings.Split(content, "\n")
	lines := make([]todoCalendarLine, 0, len(rawLines))
	for index, raw := range rawLines {
		trimmed := strings.TrimSpace(raw)
		if !strings.HasPrefix(trimmed, "-") && !strings.HasPrefix(trimmed, "=") {
			continue
		}

		body := strings.TrimSpace(trimmed[1:])
		line := todoCalendarLine{
			LineIndex: index,
			Raw:       trimmed,
		}

		if match := todoIDPattern.FindStringSubmatch(body); len(match) == 2 {
			line.TodoID = match[1]
		}
		if line.TodoID == "" {
			log.Printf("todo calendar sync skipped: missing @id line=%q", trimmed)
			continue
		}

		if match := todoDuePattern.FindStringSubmatch(body); len(match) == 2 {
			if due, err := time.Parse(time.RFC3339, match[1]); err == nil {
				line.Due = due
				line.HasDue = !isDefaultTodoDue(match[1], due)
			} else {
				log.Printf("todo due parse failed: line=%q err=%v", trimmed, err)
			}
		}

		if match := todoDescPattern.FindStringSubmatch(body); len(match) == 2 {
			line.Description = strings.ReplaceAll(match[1], `\"`, `"`)
		}

		titleText := todoIDPattern.ReplaceAllString(body, "")
		titleText = todoDuePattern.ReplaceAllString(titleText, "")
		titleText = todoDescPattern.ReplaceAllString(titleText, "")
		if beforeNote, _, ok := strings.Cut(titleText, "#"); ok {
			titleText = beforeNote
		}
		line.Title = strings.TrimSpace(titleText)
		if line.Title == "" {
			line.Title = "待办"
		}

		lines = append(lines, line)
	}
	return lines
}

func isDefaultTodoDue(raw string, due time.Time) bool {
	return raw == defaultTodoDue || due.Year() <= 1
}

func todoLinesByID(lines []todoCalendarLine) map[string]todoCalendarLine {
	result := make(map[string]todoCalendarLine, len(lines))
	for _, line := range lines {
		result[line.TodoID] = line
	}
	return result
}

func todoCalendarMappingsByTodoID(records []*core.Record) map[string]*core.Record {
	result := make(map[string]*core.Record, len(records))
	for _, record := range records {
		todoID := record.GetString("todoId")
		if todoID != "" {
			result[todoID] = record
		}
	}
	return result
}

func todoCalendarMappingMatchesLine(record *core.Record, line todoCalendarLine) bool {
	if record == nil {
		return false
	}
	lastDue := record.GetDateTime("lastDue").Time()
	return record.GetString("lastTitle") == line.Title &&
		record.GetString("lastDesc") == line.Description &&
		lastDue.Equal(line.Due)
}

func googleCalendarServiceForDiaryUser(app core.App, record *core.Record) *GoogleCalendarService {
	userID := record.GetString("user")
	if userID == "" {
		return nil
	}

	userRecord, err := app.FindRecordById("users", userID)
	if err != nil {
		log.Printf("todo calendar user lookup failed: user=%s err=%v", userID, err)
		return nil
	}

	service, err := GoogleCalendarServiceForUserConfig(
		userID,
		userRecord.GetString("googleCalendarCredentials"),
		userRecord.GetString("googleCalendarID"),
	)
	if err != nil {
		log.Printf("todo calendar config load failed: user=%s err=%v", userID, err)
		return nil
	}
	return service
}

func upsertTodoCalendarEvent(app core.App, service *GoogleCalendarService, diary *core.Record, line todoCalendarLine, eventRecord *core.Record) {
	if eventRecord == nil {
		eventRecord = findTodoCalendarEventRecord(app, diary.Id, line.TodoID)
	}
	eventID := ""
	if eventRecord != nil {
		eventID = eventRecord.GetString("googleCalendarEventId")
	}

	endTime := line.Due.Add(15 * time.Minute)
	if eventID != "" {
		if err := service.UpdateEvent(eventID, line.Title, line.Description, line.Due, endTime); err != nil {
			log.Printf("todo calendar update failed: diary=%s todoId=%s err=%v", diary.Id, line.TodoID, err)
			notifyTodoCalendarFailure(app, diary.GetString("user"), diary.Id, line, "update_event", err.Error())
			return
		}
		setTodoCalendarMappingFields(eventRecord, diary, line, eventID)
		if err := app.Save(eventRecord); err != nil {
			log.Printf("todo calendar mapping save failed: diary=%s todoId=%s err=%v", diary.Id, line.TodoID, err)
			notifyTodoCalendarFailure(app, diary.GetString("user"), diary.Id, line, "save_mapping", err.Error())
			return
		}
		notifyTodoCalendarSuccess(app, diary.GetString("user"), diary.Id, line, "update_event")
		return
	}

	createdEventID, err := service.AddEvent(line.Title, line.Description, line.Due, endTime)
	if err != nil {
		log.Printf("todo calendar add failed: diary=%s todoId=%s err=%v", diary.Id, line.TodoID, err)
		notifyTodoCalendarFailure(app, diary.GetString("user"), diary.Id, line, "create_event", err.Error())
		return
	}

	if eventRecord == nil {
		collection, err := app.FindCollectionByNameOrId(todoCalendarCollectionName)
		if err != nil {
			log.Printf("todo calendar collection missing: %v", err)
			return
		}
		eventRecord = core.NewRecord(collection)
	}
	setTodoCalendarMappingFields(eventRecord, diary, line, createdEventID)
	if err := app.Save(eventRecord); err != nil {
		log.Printf("todo calendar mapping save failed: diary=%s todoId=%s err=%v", diary.Id, line.TodoID, err)
		notifyTodoCalendarFailure(app, diary.GetString("user"), diary.Id, line, "save_mapping", err.Error())
		return
	}
	notifyTodoCalendarSuccess(app, diary.GetString("user"), diary.Id, line, "create_event")
}

func setTodoCalendarMappingFields(record *core.Record, diary *core.Record, line todoCalendarLine, eventID string) {
	record.Set("user", diary.GetString("user"))
	record.Set("diary", diary.Id)
	record.Set("lineIndex", line.LineIndex)
	record.Set("todoId", line.TodoID)
	record.Set("googleCalendarEventId", eventID)
	record.Set("lastTitle", line.Title)
	record.Set("lastDesc", line.Description)
	record.Set("lastDue", line.Due)
}

func deleteTodoCalendarEventRecord(app core.App, service *GoogleCalendarService, eventRecord *core.Record) {
	if eventRecord == nil {
		return
	}

	diaryID := eventRecord.GetString("diary")
	todoID := eventRecord.GetString("todoId")
	eventID := eventRecord.GetString("googleCalendarEventId")
	userID := eventRecord.GetString("user")
	if eventID != "" && (service == nil || !service.Available()) {
		log.Printf("todo calendar delete skipped: google calendar config unavailable diary=%s todoId=%s", diaryID, todoID)
		notifyTodoCalendarDeleteFailure(app, userID, diaryID, todoID, "load_config", "Google Calendar 配置不可用")
		return
	}
	if eventID != "" {
		if err := service.DeleteEvent(eventID); err != nil {
			log.Printf("todo calendar delete failed: diary=%s todoId=%s err=%v", diaryID, todoID, err)
			notifyTodoCalendarDeleteFailure(app, userID, diaryID, todoID, "delete_event", err.Error())
			return
		}
	}

	if err := app.Delete(eventRecord); err != nil {
		log.Printf("todo calendar mapping delete failed: diary=%s todoId=%s err=%v", diaryID, todoID, err)
		notifyTodoCalendarDeleteFailure(app, userID, diaryID, todoID, "delete_mapping", err.Error())
		return
	}
	notifyTodoCalendarDeleteSuccess(app, userID, diaryID, todoID, "delete_event")
}

func deleteTodoCalendarEventsForDiaryID(app core.App, diaryID string) {
	records, err := findTodoCalendarEventRecordsForDiary(app, diaryID)
	if err != nil {
		log.Printf("todo calendar mapping lookup failed: diary=%s err=%v", diaryID, err)
		return
	}
	for _, record := range records {
		deleteTodoCalendarEventRecord(app, nil, record)
	}
}

func deleteTodoCalendarEventsForDiary(app core.App, diary *core.Record) {
	if diary == nil {
		return
	}
	service := googleCalendarServiceForDiaryUser(app, diary)
	records, err := findTodoCalendarEventRecordsForDiary(app, diary.Id)
	if err != nil {
		log.Printf("todo calendar mapping lookup failed: diary=%s err=%v", diary.Id, err)
		return
	}
	for _, record := range records {
		deleteTodoCalendarEventRecord(app, service, record)
	}
}

func findTodoCalendarEventRecordsForDiary(app core.App, diaryID string) ([]*core.Record, error) {
	return app.FindRecordsByFilter(
		todoCalendarCollectionName,
		"diary = {:diary}",
		"",
		0,
		0,
		dbx.Params{"diary": diaryID},
	)
}

func findTodoCalendarEventRecord(app core.App, diaryID, todoID string) *core.Record {
	record, err := app.FindFirstRecordByFilter(
		todoCalendarCollectionName,
		"diary = {:diary} && todoId = {:todoId}",
		dbx.Params{"diary": diaryID, "todoId": todoID},
	)
	if err != nil {
		return nil
	}
	return record
}

func notifyTodoCalendarFailure(app core.App, userID, diaryID string, line todoCalendarLine, operation, errMessage string) {
	payloadMap := map[string]string{"title": line.Title}
	payloadBytes, _ := json.Marshal(payloadMap)
	upsertUnreadNotification(app, notificationInput{
		UserID:       userID,
		Type:         "google_calendar_sync_failed",
		Level:        "error",
		Title:        "settings.googleCalendarSyncFailTitle",
		Message:      "settings.googleCalendarSyncFailMessage",
		Payload:      string(payloadBytes),
		Source:       "todo_calendar",
		SourceRecord: diaryID,
		SourceItem:   line.TodoID,
		Operation:    operation,
		Error:        errMessage,
	})
}

func notifyTodoCalendarSuccess(app core.App, userID, diaryID string, line todoCalendarLine, operation string) {
	payloadMap := map[string]string{"title": line.Title}
	payloadBytes, _ := json.Marshal(payloadMap)
	upsertUnreadNotification(app, notificationInput{
		UserID:       userID,
		Type:         "google_calendar_sync_success",
		Level:        "info",
		Title:        "settings.googleCalendarSyncSuccessTitle",
		Message:      "settings.googleCalendarSyncSuccessMessage",
		Payload:      string(payloadBytes),
		Source:       "todo_calendar",
		SourceRecord: diaryID,
		SourceItem:   line.TodoID,
		Operation:    operation,
	})
}

func notifyTodoCalendarDeleteFailure(app core.App, userID, diaryID, todoID, operation, errMessage string) {
	upsertUnreadNotification(app, notificationInput{
		UserID:       userID,
		Type:         "google_calendar_sync_failed",
		Level:        "error",
		Title:        "settings.googleCalendarDeleteFailTitle",
		Message:      "settings.googleCalendarDeleteFailMessage",
		Source:       "todo_calendar",
		SourceRecord: diaryID,
		SourceItem:   todoID,
		Operation:    operation,
		Error:        errMessage,
	})
}

func notifyTodoCalendarDeleteSuccess(app core.App, userID, diaryID, todoID, operation string) {
	upsertUnreadNotification(app, notificationInput{
		UserID:       userID,
		Type:         "google_calendar_sync_success",
		Level:        "info",
		Title:        "settings.googleCalendarDeleteSuccessTitle",
		Message:      "settings.googleCalendarDeleteSuccessMessage",
		Source:       "todo_calendar",
		SourceRecord: diaryID,
		SourceItem:   todoID,
		Operation:    operation,
	})
}
