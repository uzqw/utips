package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

const (
	googleCalendarMaxAttempts = 4
	googleCalendarServiceTTL  = 50 * time.Minute
	googleCalendarIdleTTL     = 2 * time.Hour
)

type GoogleCalendarService struct {
	service    *calendar.Service
	calendarID string
}

type cachedGoogleCalendarService struct {
	service    *GoogleCalendarService
	createdAt  time.Time
	lastUsedAt time.Time
}

var googleCalendarServiceCache = struct {
	sync.Mutex
	items map[string]cachedGoogleCalendarService
}{
	items: map[string]cachedGoogleCalendarService{},
}

func GoogleCalendarServiceForUserConfig(userID, credentialsJSON, calendarID string) (*GoogleCalendarService, error) {
	userID = strings.TrimSpace(userID)
	credentialsJSON = strings.TrimSpace(credentialsJSON)
	calendarID = strings.TrimSpace(calendarID)
	if userID == "" {
		return nil, errors.New("google calendar user id is empty")
	}
	if credentialsJSON == "" || calendarID == "" {
		return nil, errors.New("google calendar config is empty")
	}

	now := time.Now()
	cacheKey := googleCalendarCacheKey(userID, credentialsJSON, calendarID)

	googleCalendarServiceCache.Lock()
	defer googleCalendarServiceCache.Unlock()

	pruneGoogleCalendarServiceCacheLocked(now)
	if cached, ok := googleCalendarServiceCache.items[cacheKey]; ok {
		if now.Sub(cached.createdAt) < googleCalendarServiceTTL && now.Sub(cached.lastUsedAt) < googleCalendarIdleTTL {
			cached.lastUsedAt = now
			googleCalendarServiceCache.items[cacheKey] = cached
			return cached.service, nil
		}
		delete(googleCalendarServiceCache.items, cacheKey)
	}

	service, err := NewGoogleCalendarServiceFromUserConfig(credentialsJSON, calendarID)
	if err != nil {
		return nil, err
	}
	googleCalendarServiceCache.items[cacheKey] = cachedGoogleCalendarService{
		service:    service,
		createdAt:  now,
		lastUsedAt: now,
	}
	return service, nil
}

func googleCalendarCacheKey(userID, credentialsJSON, calendarID string) string {
	sum := sha256.Sum256([]byte(credentialsJSON))
	return userID + "|" + calendarID + "|" + hex.EncodeToString(sum[:])
}

func pruneGoogleCalendarServiceCacheLocked(now time.Time) {
	for key, cached := range googleCalendarServiceCache.items {
		if now.Sub(cached.createdAt) >= googleCalendarServiceTTL || now.Sub(cached.lastUsedAt) >= googleCalendarIdleTTL {
			delete(googleCalendarServiceCache.items, key)
		}
	}
}

func NewGoogleCalendarServiceFromUserConfig(credentialsJSON, calendarID string) (*GoogleCalendarService, error) {
	credentialsJSON = strings.TrimSpace(credentialsJSON)
	calendarID = strings.TrimSpace(calendarID)
	if credentialsJSON == "" || calendarID == "" {
		return nil, errors.New("google calendar config is empty")
	}

	service, err := calendar.NewService(
		context.Background(),
		option.WithCredentialsJSON([]byte(credentialsJSON)),
		option.WithScopes(calendar.CalendarScope),
	)
	if err != nil {
		return nil, err
	}

	return &GoogleCalendarService{
		service:    service,
		calendarID: calendarID,
	}, nil
}

func (s *GoogleCalendarService) Available() bool {
	return s != nil && s.service != nil && s.calendarID != ""
}

func (s *GoogleCalendarService) AddEvent(title, description string, startTime, endTime time.Time) (string, error) {
	if !s.Available() {
		return "", errors.New("google calendar service unavailable")
	}

	var created *calendar.Event
	err := withGoogleCalendarRetry("create_calendar_event", func() error {
		var err error
		created, err = s.service.Events.Insert(s.calendarID, buildCalendarEvent(title, description, startTime, endTime)).Do()
		return err
	})
	if err != nil {
		return "", err
	}

	log.Printf("google calendar add ok: eventID=%s title=%q", created.Id, title)
	return created.Id, nil
}

func (s *GoogleCalendarService) UpdateEvent(eventID, title, description string, startTime, endTime time.Time) error {
	if !s.Available() {
		return errors.New("google calendar service unavailable")
	}

	err := withGoogleCalendarRetry("update_calendar_event", func() error {
		_, err := s.service.Events.Update(s.calendarID, eventID, buildCalendarEvent(title, description, startTime, endTime)).Do()
		return err
	})
	if err != nil {
		return err
	}

	log.Printf("google calendar update ok: eventID=%s title=%q", eventID, title)
	return nil
}

func (s *GoogleCalendarService) DeleteEvent(eventID string) error {
	if !s.Available() {
		return errors.New("google calendar service unavailable")
	}

	if err := withGoogleCalendarRetry("delete_calendar_event", func() error {
		return s.service.Events.Delete(s.calendarID, eventID).Do()
	}); err != nil {
		return err
	}

	log.Printf("google calendar delete ok: eventID=%s", eventID)
	return nil
}

func withGoogleCalendarRetry(phase string, operation func() error) error {
	var lastErr error
	for attempt := 1; attempt <= googleCalendarMaxAttempts; attempt++ {
		lastErr = operation()
		if lastErr == nil {
			return nil
		}
		if !isRetryableGoogleCalendarError(lastErr) || attempt == googleCalendarMaxAttempts {
			return fmt.Errorf("phase=%s attempt=%d/%d: %w", phase, attempt, googleCalendarMaxAttempts, lastErr)
		}
		delay := time.Duration(attempt*attempt) * time.Second
		log.Printf("google calendar retry: phase=%s attempt=%d/%d delay=%s err=%v", phase, attempt, googleCalendarMaxAttempts, delay, lastErr)
		time.Sleep(delay)
	}
	return lastErr
}

func isRetryableGoogleCalendarError(err error) bool {
	if err == nil {
		return false
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	var apiErr *googleapi.Error
	if errors.As(err, &apiErr) {
		return apiErr.Code == http.StatusTooManyRequests || apiErr.Code >= http.StatusInternalServerError
	}
	errText := strings.ToLower(err.Error())
	retryableFragments := []string{
		"eof",
		"connection reset",
		"connection refused",
		"timeout",
		"tls handshake timeout",
		"temporary",
		"cannot fetch token",
	}
	for _, fragment := range retryableFragments {
		if strings.Contains(errText, fragment) {
			return true
		}
	}
	return false
}

func buildCalendarEvent(title, description string, startTime, endTime time.Time) *calendar.Event {
	tz := strings.TrimSpace(os.Getenv("TZ"))
	if tz == "" {
		tz = "Asia/Shanghai" // default fallback
	}
	return &calendar.Event{
		Summary:     title,
		Description: description,
		Start: &calendar.EventDateTime{
			DateTime: startTime.Format(time.RFC3339),
			TimeZone: tz,
		},
		End: &calendar.EventDateTime{
			DateTime: endTime.Format(time.RFC3339),
			TimeZone: tz,
		},
	}
}
