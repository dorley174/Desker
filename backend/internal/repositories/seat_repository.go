package repositories

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"

	"github.com/nov-o/desker/backend/internal/models"
)

// SeatFilter is used for querying seats.
type SeatFilter struct {
	Floor        int
	Date         string
	Tags         []string
	StatusFilter string
	UserID       string
}

// SeatRepository defines seat-related persistence operations.
type SeatRepository interface {
	ListSeats(ctx context.Context, filter SeatFilter) ([]models.Seat, error)
	GetSeatSlots(ctx context.Context, seatID, date, userID string) ([]models.HourSlot, error)
}

type seatRepository struct {
	db *sqlx.DB
}

func NewSeatRepository(db *sqlx.DB) SeatRepository {
	return &seatRepository{db: db}
}

func (r *seatRepository) ListSeats(ctx context.Context, filter SeatFilter) ([]models.Seat, error) {
	const seatsQ = `
		SELECT id, seat_number, zone, floor, tags, is_available
		FROM seats
		WHERE floor = ?
		ORDER BY zone ASC, seat_number ASC
	`
	rows := []struct {
		ID          string `db:"id"`
		SeatNumber  int    `db:"seat_number"`
		Zone        string `db:"zone"`
		Floor       int    `db:"floor"`
		Tags        string `db:"tags"`
		IsAvailable bool   `db:"is_available"`
	}{}
	if err := r.db.SelectContext(ctx, &rows, rebind(r.db, seatsQ), filter.Floor); err != nil {
		return nil, fmt.Errorf("list seats: %w", err)
	}

	const bookingsQ = `
		SELECT seat_id, user_id
		FROM bookings
		WHERE booking_date = ?
		  AND status = 'active'
	`
	bookingRows := []struct {
		SeatID string `db:"seat_id"`
		UserID string `db:"user_id"`
	}{}
	if err := r.db.SelectContext(ctx, &bookingRows, rebind(r.db, bookingsQ), filter.Date); err != nil {
		return nil, fmt.Errorf("list seat bookings: %w", err)
	}
	occupiedBySeat := make(map[string]string, len(bookingRows))
	for _, row := range bookingRows {
		if _, exists := occupiedBySeat[row.SeatID]; !exists {
			occupiedBySeat[row.SeatID] = row.UserID
		}
	}

	normalizedStatus := strings.ToLower(strings.TrimSpace(filter.StatusFilter))
	if normalizedStatus == "" {
		normalizedStatus = "all"
	}

	seats := make([]models.Seat, 0, len(rows))
	for _, row := range rows {
		tags := parseTags(row.Tags)
		if !matchesAllTags(tags, filter.Tags) {
			continue
		}

		status := models.SeatStatusFree
		switch {
		case !row.IsAvailable:
			status = models.SeatStatusUnavailable
		case occupiedBySeat[row.ID] == filter.UserID && filter.UserID != "":
			status = models.SeatStatusMine
		case occupiedBySeat[row.ID] != "":
			status = models.SeatStatusOccupied
		}

		if normalizedStatus == "free" && status != models.SeatStatusFree {
			continue
		}
		if normalizedStatus == "occupied" && status != models.SeatStatusOccupied && status != models.SeatStatusMine {
			continue
		}

		seats = append(seats, models.Seat{
			ID:     row.ID,
			Number: row.SeatNumber,
			Zone:   row.Zone,
			Floor:  row.Floor,
			Tags:   tags,
			Status: status,
		})
	}

	sort.SliceStable(seats, func(i, j int) bool {
		if seats[i].Zone == seats[j].Zone {
			return seats[i].Number < seats[j].Number
		}
		return seats[i].Zone < seats[j].Zone
	})

	return seats, nil
}

func (r *seatRepository) GetSeatSlots(ctx context.Context, seatID, date, userID string) ([]models.HourSlot, error) {
	const q = `
		SELECT start_hour, end_hour, user_id
		FROM bookings
		WHERE seat_id = ?
		  AND booking_date = ?
		  AND status = 'active'
	`

	type bookingRange struct {
		StartHour int    `db:"start_hour"`
		EndHour   int    `db:"end_hour"`
		UserID    string `db:"user_id"`
	}

	var ranges []bookingRange
	if err := r.db.SelectContext(ctx, &ranges, rebind(r.db, q), seatID, date); err != nil {
		return nil, fmt.Errorf("get seat slots: %w", err)
	}

	slots := make([]models.HourSlot, 0, 12)
	for h := 8; h < 20; h++ {
		status := models.SlotStatusFree
		for _, b := range ranges {
			if h >= b.StartHour && h < b.EndHour {
				if b.UserID == userID {
					status = models.SlotStatusMine
				} else {
					status = models.SlotStatusOccupied
				}
				break
			}
		}
		slots = append(slots, models.HourSlot{Hour: h, Status: status})
	}

	return slots, nil
}
