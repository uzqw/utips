package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// 在服务启动前初始化 collections
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// 初始化 collections（如果不存在）
		if err := initCollections(app); err != nil {
			log.Printf("Warning: Failed to init collections: %v", err)
		}

		
		se.Router.POST("/api/google_calendar/test", func(e *core.RequestEvent) error {
			if e.Auth == nil {
				return e.JSON(401, map[string]string{"message": "Unauthorized"})
			}
			var body struct {
				Credentials string `json:"credentials"`
				CalendarID  string `json:"calendarID"`
			}
			if err := e.BindBody(&body); err != nil {
				return e.JSON(400, map[string]string{"message": "Invalid request body"})
			}

			service, err := NewGoogleCalendarServiceFromUserConfig(body.Credentials, body.CalendarID)
			if err != nil {
				errorMsg := "Config error: " + err.Error()
				upsertUnreadNotification(e.App, notificationInput{
					UserID:  e.Auth.Id,
					Type:    "google_calendar_test",
					Level:   "error",
					Title:   "settings.googleCalendarTestFailTitle",
					Message: errorMsg,
					Source:  "google_calendar",
				})
				return e.JSON(400, map[string]string{"message": errorMsg})
			}

			cal, err := service.service.Calendars.Get(body.CalendarID).Do()
			if err != nil {
				errorMsg := err.Error()
				upsertUnreadNotification(e.App, notificationInput{
					UserID:  e.Auth.Id,
					Type:    "google_calendar_test",
					Level:   "error",
					Title:   "settings.googleCalendarTestFailTitle",
					Message: errorMsg,
					Source:  "google_calendar",
				})
				return e.JSON(400, map[string]string{"message": "Test failed: " + errorMsg})
			}

			payloadMap := map[string]string{
				"name": cal.Summary,
			}
			payloadBytes, _ := json.Marshal(payloadMap)

			upsertUnreadNotification(e.App, notificationInput{
				UserID:  e.Auth.Id,
				Type:    "google_calendar_test",
				Level:   "info",
				Title:   "settings.googleCalendarTestSuccessTitle",
				Message: "settings.googleCalendarTestSuccessMessage",
				Payload: string(payloadBytes),
				Source:  "google_calendar",
			})

			return e.JSON(200, map[string]string{"message": cal.Summary})
		})

		se.Router.POST("/api/weather/test", func(e *core.RequestEvent) error {
			if e.Auth == nil {
				return e.JSON(401, map[string]string{"message": "Unauthorized"})
			}
			
			var body struct {
				City string `json:"city"`
				Key  string `json:"key"`
			}
			if err := e.BindBody(&body); err != nil {
				return e.JSON(400, map[string]string{"message": "Invalid request body"})
			}
			
			if body.City == "" || body.Key == "" {
				return e.JSON(400, map[string]string{"message": "City and Key are required"})
			}
			
			resp, err := http.Get(fmt.Sprintf("https://restapi.amap.com/v3/weather/weatherInfo?city=%s&key=%s", body.City, body.Key))
			if err != nil {
				errorMsg := "Network request failed: " + err.Error()
				upsertUnreadNotification(e.App, notificationInput{
					UserID:  e.Auth.Id,
					Type:    "amap_weather_test",
					Level:   "error",
					Title:   "settings.amapWeatherTestFailTitle",
					Message: errorMsg,
					Source:  "amap_weather",
				})
				return e.JSON(400, map[string]string{"message": errorMsg})
			}
			defer resp.Body.Close()
			
			var amapResp struct {
				Status string `json:"status"`
				Info   string `json:"info"`
				Lives  []struct {
					City        string `json:"city"`
					Weather     string `json:"weather"`
					Temperature string `json:"temperature"`
				} `json:"lives"`
			}
			
			if err := json.NewDecoder(resp.Body).Decode(&amapResp); err != nil {
				errorMsg := "Failed to parse API response: " + err.Error()
				upsertUnreadNotification(e.App, notificationInput{
					UserID:  e.Auth.Id,
					Type:    "amap_weather_test",
					Level:   "error",
					Title:   "settings.amapWeatherTestFailTitle",
					Message: errorMsg,
					Source:  "amap_weather",
				})
				return e.JSON(400, map[string]string{"message": errorMsg})
			}
			
			if amapResp.Status != "1" || len(amapResp.Lives) == 0 {
				failReason := amapResp.Info
				if failReason == "" {
					failReason = "Unknown error"
				}
				upsertUnreadNotification(e.App, notificationInput{
					UserID:  e.Auth.Id,
					Type:    "amap_weather_test",
					Level:   "warning",
					Title:   "settings.amapWeatherTestFailTitle",
					Message: failReason,
					Source:  "amap_weather",
				})
				return e.JSON(400, map[string]string{"message": "Amap weather test failed: " + failReason})
			}
			
			live := amapResp.Lives[0]
			
			payloadMap := map[string]string{
				"city":    live.City,
				"weather": live.Weather,
				"temp":    live.Temperature,
			}
			payloadBytes, _ := json.Marshal(payloadMap)
			
			upsertUnreadNotification(e.App, notificationInput{
				UserID:  e.Auth.Id,
				Type:    "amap_weather_test",
				Level:   "info",
				Title:   "settings.amapWeatherTestSuccessTitle",
				Message: "settings.amapWeatherTestSuccessMessage",
				Payload: string(payloadBytes),
				Source:  "amap_weather",
			})
			
			return e.JSON(200, map[string]interface{}{
				"message": "Weather test successful!",
				"live": live,
			})
		})

		se.Router.GET("/utips-config.js", serveRuntimeConfig)

		// Serves static files from the provided public dir (if exists)
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), true))
		return se.Next()
	})

	// Custom hooks for diary statistics, category counts, etc.
	registerDiaryHooks(app)
	registerTodoCalendarHooks(app)
	registerRegistrationHooks(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// initCollections creates the required collections if they don't exist
func initCollections(app *pocketbase.PocketBase) error {
	// Get categories collection (should exist now)
	categoriesCollection, err := app.FindCollectionByNameOrId("categories")
	if err != nil {
		log.Println("Creating categories collection...")
		categoriesCollection = core.NewBaseCollection("categories")
		categoriesCollection.Fields.Add(&core.TextField{Name: "name_en", Required: true, Max: 50})
		categoriesCollection.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 50})
		categoriesCollection.Fields.Add(&core.TextField{Name: "color", Required: true, Max: 10})
		categoriesCollection.Fields.Add(&core.NumberField{Name: "sort_id"})

		// 设置 API 规则 - 公开可读（空字符串表示公开访问）
		publicRule := ""
		categoriesCollection.ListRule = &publicRule
		categoriesCollection.ViewRule = &publicRule

		if err := app.Save(categoriesCollection); err != nil {
			return err
		}

		// 添加默认分类
		seedCategories(app, categoriesCollection)
	}

	// Get users collection
	usersCollection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err // users collection should always exist
	}

	// 设置登录有效期为最大允许值（约 3 年）
	usersCollection.AuthToken.Duration = 94670856
	if usersCollection.Fields.GetByName("googleCalendarCredentials") == nil {
		usersCollection.Fields.Add(&core.TextField{Name: "googleCalendarCredentials", Max: 5000})
	}
	if usersCollection.Fields.GetByName("googleCalendarID") == nil {
		usersCollection.Fields.Add(&core.TextField{Name: "googleCalendarID", Max: 500})
	}
	if usersCollection.Fields.GetByName("amapCity") == nil {
		usersCollection.Fields.Add(&core.TextField{Name: "amapCity", Max: 100})
	}
	if usersCollection.Fields.GetByName("amapKey") == nil {
		usersCollection.Fields.Add(&core.TextField{Name: "amapKey", Max: 100})
	}
	if usersCollection.Fields.GetByName("autoLoadWeather") == nil {
		usersCollection.Fields.Add(&core.BoolField{Name: "autoLoadWeather"})
	}
	if err := app.Save(usersCollection); err != nil {
		log.Printf("Warning: Failed to save users collection duration: %v", err)
	}
	seedDemoAccount(app, usersCollection)
	if err := ensureNotificationsCollection(app, usersCollection); err != nil {
		log.Printf("Warning: Failed to init notifications collection: %v", err)
	}

	// Check if diaries collection exists
	diariesCollection, err := app.FindCollectionByNameOrId("diaries")
	if err != nil {
		log.Println("Creating diaries collection...")
		diariesCollection = core.NewBaseCollection("diaries")
		diariesCollection.Fields.Add(&core.DateField{Name: "date", Required: true})
		diariesCollection.Fields.Add(&core.TextField{Name: "title", Required: true, Max: 500})
		diariesCollection.Fields.Add(&core.TextField{Name: "content"})
		diariesCollection.Fields.Add(&core.NumberField{Name: "temperature"})
		diariesCollection.Fields.Add(&core.NumberField{Name: "temperature_outside"})
		diariesCollection.Fields.Add(&core.SelectField{
			Name:   "weather",
			Values: []string{"sunny", "cloudy", "overcast", "sprinkle", "rain", "thunderstorm", "fog", "snow", "tornado", "smog", "sandstorm"},
		})
		diariesCollection.Fields.Add(&core.RelationField{
			Name:         "category",
			CollectionId: categoriesCollection.Id, // 使用实际的 collection ID
			MaxSelect:    1,
		})
		diariesCollection.Fields.Add(&core.RelationField{
			Name:         "user",
			CollectionId: usersCollection.Id, // 使用实际的 collection ID
			Required:     true,
			MaxSelect:    1,
		})
		diariesCollection.Fields.Add(&core.BoolField{Name: "is_public"})
		diariesCollection.Fields.Add(&core.BoolField{Name: "is_markdown"})

		// 设置 API 规则
		listRule := "user = @request.auth.id || is_public = true"
		viewRule := "user = @request.auth.id || is_public = true"
		createRule := "@request.auth.id != ''"
		updateRule := "user = @request.auth.id"
		deleteRule := "user = @request.auth.id"

		diariesCollection.ListRule = &listRule
		diariesCollection.ViewRule = &viewRule
		diariesCollection.CreateRule = &createRule
		diariesCollection.UpdateRule = &updateRule
		diariesCollection.DeleteRule = &deleteRule

		if err := app.Save(diariesCollection); err != nil {
			return err
		}
	}

	// Check if todo calendar sync collection exists
	todoCalendarCollection, err := app.FindCollectionByNameOrId("todo_calendar_events")
	if err != nil {
		log.Println("Creating todo_calendar_events collection...")
		todoCalendarCollection = core.NewBaseCollection("todo_calendar_events")
		todoCalendarCollection.Fields.Add(&core.RelationField{
			Name:          "user",
			CollectionId:  usersCollection.Id,
			Required:      true,
			MaxSelect:     1,
			CascadeDelete: true,
		})
		todoCalendarCollection.Fields.Add(&core.RelationField{
			Name:          "diary",
			CollectionId:  diariesCollection.Id,
			Required:      true,
			MaxSelect:     1,
			CascadeDelete: true,
		})
		todoCalendarCollection.Fields.Add(&core.NumberField{Name: "lineIndex", OnlyInt: true})
		todoCalendarCollection.Fields.Add(&core.TextField{Name: "todoId", Max: 80})
		todoCalendarCollection.Fields.Add(&core.TextField{Name: "googleCalendarEventId", Max: 500})
		todoCalendarCollection.Fields.Add(&core.TextField{Name: "lastTitle", Max: 500})
		todoCalendarCollection.Fields.Add(&core.TextField{Name: "lastDesc", Max: 2000})
		todoCalendarCollection.Fields.Add(&core.DateField{Name: "lastDue"})
		todoCalendarCollection.AddIndex("idx_todo_calendar_events_diary_line", false, "diary, lineIndex", "")
		todoCalendarCollection.AddIndex("idx_todo_calendar_events_diary_todo_id", true, "diary, todoId", "todoId != ''")

		rule := "user = @request.auth.id"
		todoCalendarCollection.ListRule = &rule
		todoCalendarCollection.ViewRule = &rule
		todoCalendarCollection.CreateRule = &rule
		todoCalendarCollection.UpdateRule = &rule
		todoCalendarCollection.DeleteRule = &rule

		if err := app.Save(todoCalendarCollection); err != nil {
			return err
		}
	} else {
		if todoCalendarCollection.Fields.GetByName("todoId") == nil {
			todoCalendarCollection.Fields.Add(&core.TextField{Name: "todoId", Max: 80})
		}
		if todoCalendarCollection.Fields.GetByName("lastTitle") == nil {
			todoCalendarCollection.Fields.Add(&core.TextField{Name: "lastTitle", Max: 500})
		}
		if todoCalendarCollection.Fields.GetByName("lastDesc") == nil {
			todoCalendarCollection.Fields.Add(&core.TextField{Name: "lastDesc", Max: 2000})
		}
		if todoCalendarCollection.Fields.GetByName("lastDue") == nil {
			todoCalendarCollection.Fields.Add(&core.DateField{Name: "lastDue"})
		}
		todoCalendarCollection.AddIndex("idx_todo_calendar_events_diary_line", false, "diary, lineIndex", "")
		todoCalendarCollection.AddIndex("idx_todo_calendar_events_diary_todo_id", true, "diary, todoId", "todoId != ''")
		if err := app.Save(todoCalendarCollection); err != nil {
			return err
		}
	}

	// Check if files collection exists
	_, err = app.FindCollectionByNameOrId("files")
	if err != nil {
		log.Println("Creating files collection...")
		filesCollection := core.NewBaseCollection("files")
		filesCollection.Fields.Add(&core.TextField{Name: "name_original", Required: true, Max: 255})
		filesCollection.Fields.Add(&core.FileField{Name: "file", Required: true, MaxSelect: 1, MaxSize: 52428800})
		filesCollection.Fields.Add(&core.TextField{Name: "description", Max: 500})
		filesCollection.Fields.Add(&core.SelectField{
			Name:   "file_type",
			Values: []string{"image", "file", "document"},
		})
		filesCollection.Fields.Add(&core.RelationField{
			Name:         "user",
			CollectionId: usersCollection.Id, // 使用实际的 collection ID
			Required:     true,
			MaxSelect:    1,
		})

		// 设置 API 规则
		rule := "user = @request.auth.id"
		createRule := "@request.auth.id != ''"

		filesCollection.ListRule = &rule
		filesCollection.ViewRule = &rule
		filesCollection.CreateRule = &createRule
		filesCollection.UpdateRule = &rule
		filesCollection.DeleteRule = &rule

		if err := app.Save(filesCollection); err != nil {
			return err
		}
	}

	return nil
}

type publicRuntimeConfig struct {
	AdminEmail                     string `json:"adminEmail"`
	ICPBeianNumber                 string `json:"icpBeianNumber"`
	RegistrationInvitationRequired bool   `json:"registrationInvitationRequired"`
	IsShowDemoAccount              bool   `json:"isShowDemoAccount"`
	DemoAccount                    string `json:"demoAccount"`
	DemoAccountPassword            string `json:"demoAccountPassword"`
}

func serveRuntimeConfig(e *core.RequestEvent) error {
	data, err := json.Marshal(getPublicRuntimeConfig())
	if err != nil {
		return err
	}

	e.Response.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	return e.String(200, "window.__UTIPS_CONFIG__ = "+string(data)+";")
}

func getPublicRuntimeConfig() publicRuntimeConfig {
	demoEmail := strings.TrimSpace(os.Getenv("UTIPS_DEMO_ACCOUNT_EMAIL"))
	demoPassword := os.Getenv("UTIPS_DEMO_ACCOUNT_PASSWORD")

	return publicRuntimeConfig{
		AdminEmail:                     strings.TrimSpace(os.Getenv("UTIPS_ADMIN_EMAIL")),
		ICPBeianNumber:                 strings.TrimSpace(os.Getenv("UTIPS_ICP_BEIAN_NUMBER")),
		RegistrationInvitationRequired: strings.TrimSpace(os.Getenv("UTIPS_REGISTRATION_INVITATION_CODE")) != "",
		IsShowDemoAccount:              envBool("UTIPS_DEMO_ACCOUNT_ENABLED", demoEmail != "" && demoPassword != ""),
		DemoAccount:                    demoEmail,
		DemoAccountPassword:            demoPassword,
	}
}

func registerRegistrationHooks(app *pocketbase.PocketBase) {
	app.OnRecordCreateRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		expectedCode := strings.TrimSpace(os.Getenv("UTIPS_REGISTRATION_INVITATION_CODE"))
		if expectedCode == "" {
			return e.Next()
		}

		info, err := e.RequestInfo()
		if err != nil {
			return err
		}
		code, _ := info.Body["invitationCode"].(string)
		if strings.TrimSpace(code) != expectedCode {
			return apis.NewBadRequestError("邀请码错误", nil)
		}
		return e.Next()
	})
}

func seedDemoAccount(app *pocketbase.PocketBase, usersCollection *core.Collection) {
	config := getPublicRuntimeConfig()
	if !config.IsShowDemoAccount || config.DemoAccount == "" || config.DemoAccountPassword == "" {
		return
	}

	if record, err := app.FindAuthRecordByEmail(usersCollection, config.DemoAccount); err == nil {
		record.Set("name", envString("UTIPS_DEMO_ACCOUNT_NAME", "演示账号"))
		record.SetEmailVisibility(true)
		record.SetVerified(true)
		record.SetPassword(config.DemoAccountPassword)
		if err := app.Save(record); err != nil {
			log.Printf("Warning: Failed to update demo account %s: %v", config.DemoAccount, err)
		}
		return
	}

	record := core.NewRecord(usersCollection)
	record.Set("email", config.DemoAccount)
	record.Set("name", envString("UTIPS_DEMO_ACCOUNT_NAME", "演示账号"))
	record.SetEmailVisibility(true)
	record.SetVerified(true)
	record.SetPassword(config.DemoAccountPassword)

	if err := app.Save(record); err != nil {
		log.Printf("Warning: Failed to seed demo account %s: %v", config.DemoAccount, err)
		return
	}
	log.Printf("Seeded demo account %s", config.DemoAccount)
}

func envString(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

// seedCategories adds default categories
func seedCategories(app *pocketbase.PocketBase, collection *core.Collection) {
	categories := []struct {
		NameEn string
		Name   string
		Color  string
		SortID int
	}{
		{"life", "生活", "#FF9500", 1},
		{"study", "学习", "#4CD964", 2},
		{"bigevent", "大事", "#FF3B30", 3},
		{"sport", "运动", "#FFCC00", 4},
		{"todo", "待办", "#24C5FF", 4},
		{"week", "周报", "#5856D6", 5},
		{"work", "工作", "#007AFF", 6},
		{"game", "游戏", "#5AC8FA", 7},
		{"film", "电影", "#FF2D70", 8},
		{"article", "文章", "#CC73E1", 9},
		{"bill", "账单", "#8bc34a", 10},
		{"memo", "备忘", "#BABABA", 11},
		{"play", "剧本", "#00AAFF", 12},
		{"sentiment", "情感", "#00C975", 13},
	}

	for _, cat := range categories {
		record := core.NewRecord(collection)
		record.Set("name_en", cat.NameEn)
		record.Set("name", cat.Name)
		record.Set("color", cat.Color)
		record.Set("sort_id", cat.SortID)

		if err := app.Save(record); err != nil {
			log.Printf("Failed to seed category %s: %v", cat.NameEn, err)
		}
	}
	log.Printf("Seeded %d categories", len(categories))
}

// registerDiaryHooks registers custom hooks for diary-related operations
func registerDiaryHooks(app *pocketbase.PocketBase) {
	// Hook: Update category diary count after diary creation
	app.OnRecordAfterCreateSuccess("diaries").BindFunc(func(e *core.RecordEvent) error {
		// Update category count logic can be added here
		return e.Next()
	})

	// Hook: Update category diary count after diary deletion
	app.OnRecordAfterDeleteSuccess("diaries").BindFunc(func(e *core.RecordEvent) error {
		// Update category count logic can be added here
		return e.Next()
	})

	// Hook: Update user's last visit time on auth refresh
	app.OnRecordAuthRefreshRequest("users").BindFunc(func(e *core.RecordAuthRefreshRequestEvent) error {
		e.Record.Set("updated", nil) // Will auto-update to current time
		return e.Next()
	})
}
