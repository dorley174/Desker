package repositories

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/nov-o/desker/backend/internal/models"
)

func rebind(db *sqlx.DB, query string) string {
	if db == nil {
		return query
	}
	return db.Rebind(query)
}

func parseTags(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw), &tags); err != nil {
		return []string{}
	}
	return tags
}

func serializeTags(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	data, err := json.Marshal(tags)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func matchesAllTags(seatTags, required []string) bool {
	if len(required) == 0 {
		return true
	}
	available := make(map[string]struct{}, len(seatTags))
	for _, tag := range seatTags {
		available[strings.ToLower(strings.TrimSpace(tag))] = struct{}{}
	}
	for _, tag := range required {
		if _, ok := available[strings.ToLower(strings.TrimSpace(tag))]; !ok {
			return false
		}
	}
	return true
}

func normalizeBookingStatus(bookingDate string, endHour int, status models.BookingStatus, now time.Time) models.BookingStatus {
	if status != models.BookingStatusActive {
		return status
	}
	dateValue, err := time.Parse("2006-01-02", bookingDate)
	if err != nil {
		return status
	}
	location := now.Location()
	finish := time.Date(dateValue.Year(), dateValue.Month(), dateValue.Day(), endHour, 0, 0, 0, location)
	if !finish.After(now) {
		return models.BookingStatusCompleted
	}
	return status
}
