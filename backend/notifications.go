package main

import (
	"log"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

const notificationsCollectionName = "notifications"

type notificationInput struct {
	UserID       string
	Type         string
	Level        string
	Title        string
	Message      string
	Source       string
	SourceRecord string
	SourceItem   string
	Operation    string
	Payload      string
	Error        string
}

func ensureNotificationsCollection(app core.App, usersCollection *core.Collection) error {
	if notificationsCollection, err := app.FindCollectionByNameOrId(notificationsCollectionName); err == nil {
		rule := "user = @request.auth.id"
		updated := false
		if notificationsCollection.ListRule == nil || *notificationsCollection.ListRule != rule {
			notificationsCollection.ListRule = &rule
			updated = true
		}
		if notificationsCollection.ViewRule == nil || *notificationsCollection.ViewRule != rule {
			notificationsCollection.ViewRule = &rule
			updated = true
		}
		if notificationsCollection.CreateRule == nil || *notificationsCollection.CreateRule != rule {
			notificationsCollection.CreateRule = &rule
			updated = true
		}
		if notificationsCollection.UpdateRule == nil || *notificationsCollection.UpdateRule != rule {
			notificationsCollection.UpdateRule = &rule
			updated = true
		}
		if notificationsCollection.DeleteRule == nil || *notificationsCollection.DeleteRule != rule {
			notificationsCollection.DeleteRule = &rule
			updated = true
		}
		if updated {
			log.Println("Updating notifications collection rules...")
			return app.Save(notificationsCollection)
		}
		return nil
	}

	log.Println("Creating notifications collection...")
	notificationsCollection := core.NewBaseCollection(notificationsCollectionName)
	notificationsCollection.Fields.Add(&core.RelationField{
		Name:          "user",
		CollectionId:  usersCollection.Id,
		Required:      true,
		MaxSelect:     1,
		CascadeDelete: true,
	})
	notificationsCollection.Fields.Add(&core.TextField{Name: "type", Required: true, Max: 120})
	notificationsCollection.Fields.Add(&core.SelectField{Name: "level", Values: []string{"info", "warning", "error"}})
	notificationsCollection.Fields.Add(&core.TextField{Name: "title", Required: true, Max: 200})
	notificationsCollection.Fields.Add(&core.TextField{Name: "message", Max: 1000})
	notificationsCollection.Fields.Add(&core.TextField{Name: "source", Max: 120})
	notificationsCollection.Fields.Add(&core.TextField{Name: "sourceRecord", Max: 120})
	notificationsCollection.Fields.Add(&core.TextField{Name: "sourceItem", Max: 120})
	notificationsCollection.Fields.Add(&core.TextField{Name: "operation", Max: 120})
	notificationsCollection.Fields.Add(&core.TextField{Name: "payload", Max: 5000})
	notificationsCollection.Fields.Add(&core.TextField{Name: "error", Max: 2000})
	notificationsCollection.Fields.Add(&core.BoolField{Name: "isRead"})
	notificationsCollection.Fields.Add(&core.DateField{Name: "readAt"})
	notificationsCollection.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
	notificationsCollection.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
	notificationsCollection.AddIndex("idx_notifications_user_read_created", false, "user, isRead, created", "")
	notificationsCollection.AddIndex("idx_notifications_source_item", false, "user, source, sourceRecord, sourceItem, operation", "")

	rule := "user = @request.auth.id"
	notificationsCollection.ListRule = &rule
	notificationsCollection.ViewRule = &rule
	notificationsCollection.CreateRule = &rule
	notificationsCollection.UpdateRule = &rule
	notificationsCollection.DeleteRule = &rule

	return app.Save(notificationsCollection)
}

func upsertUnreadNotification(app core.App, input notificationInput) {
	if input.UserID == "" {
		return
	}
	if input.Type == "" {
		input.Type = "system"
	}
	if input.Level == "" {
		input.Level = "error"
	}
	if input.Title == "" {
		input.Title = "settings.backendOperationFailed"
	}

	record := findUnreadNotification(app, input)
	if record == nil {
		collection, err := app.FindCollectionByNameOrId(notificationsCollectionName)
		if err != nil {
			log.Printf("notification collection missing: %v", err)
			return
		}
		record = core.NewRecord(collection)
		record.Set("user", input.UserID)
		record.Set("type", input.Type)
		record.Set("level", input.Level)
		record.Set("source", input.Source)
		record.Set("sourceRecord", input.SourceRecord)
		record.Set("sourceItem", input.SourceItem)
		record.Set("operation", input.Operation)
		record.Set("isRead", false)
	}

	record.Set("title", input.Title)
	record.Set("message", input.Message)
	record.Set("payload", input.Payload)
	record.Set("error", input.Error)
	record.Set("readAt", nil)

	if err := app.Save(record); err != nil {
		log.Printf("notification save failed: user=%s source=%s operation=%s err=%v", input.UserID, input.Source, input.Operation, err)
	}
}

func findUnreadNotification(app core.App, input notificationInput) *core.Record {
	record, err := app.FindFirstRecordByFilter(
		notificationsCollectionName,
		"user = {:user} && source = {:source} && sourceRecord = {:sourceRecord} && sourceItem = {:sourceItem} && operation = {:operation} && isRead = false",
		dbx.Params{
			"user":         input.UserID,
			"source":       input.Source,
			"sourceRecord": input.SourceRecord,
			"sourceItem":   input.SourceItem,
			"operation":    input.Operation,
		},
	)
	if err != nil {
		return nil
	}
	return record
}
