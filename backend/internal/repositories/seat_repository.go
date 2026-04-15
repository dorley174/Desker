package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

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
	q := `
		WITH seat_status AS (
			SELECT
				s.id,
				s.seat_number AS number,
				s.zone,
				s.floor,
				s.tags,
				CASE
					WHEN NOT s.is_available THEN 'unavailable'
					WHEN EXISTS (
						SELECT 1
						FROM bookings b
						WHERE b.seat_id = s.id
						  AND b.booking_date = $1
						  AND b.status <> 'cancelled'
						  AND b.user_id = $2
					) THEN 'mine'
					WHEN EXISTS (
						SELECT 1
						FROM bookings b
						WHERE b.seat_id = s.id
						  AND b.booking_date = $1
						  AND b.status <> 'cancelled'
					) THEN 'occupied'
					ELSE 'free'
				END AS status
			FROM seats s
			WHERE s.floor = $3
			  AND ($4::text[] IS NULL OR s.tags @> $4::text[])
		)
		SELECT id, number, zone, floor, tags, status
		FROM seat_status
		WHERE (
			$5 = 'all' OR
			($5 = 'free' AND status = 'free') OR
			($5 = 'occupied' AND status IN ('occupied', 'mine'))
		)
		ORDER BY zone ASC, number ASC
	`

	normalizedStatus := strings.ToLower(strings.TrimSpace(filter.StatusFilter))
	if normalizedStatus == "" {
		normalizedStatus = "all"
	}

	var tagsArg any
	if len(filter.Tags) == 0 {
		tagsArg = nil
	} else {
		tagsArg = pq.Array(filter.Tags)
	}

	rows := []struct {
		ID     string            `db:"id"`
		Number int               `db:"number"`
		Zone   string            `db:"zone"`
		Floor  int               `db:"floor"`
		Tags   pq.StringArray    `db:"tags"`
		Status models.SeatStatus `db:"status"`
	}{}

	if err := r.db.SelectContext(ctx, &rows, q, filter.Date, filter.UserID, filter.Floor, tagsArg, normalizedStatus); err != nil {
		return nil, fmt.Errorf("list seats: %w", err)
	}

	seats := make([]models.Seat, 0, len(rows))
	for _, row := range rows {
		seats = append(seats, models.Seat{
			ID:     row.ID,
			Number: row.Number,
			Zone:   row.Zone,
			Floor:  row.Floor,
			Tags:   []string(row.Tags),
			Status: row.Status,
		})
	}

	return seats, nil
}

func (r *seatRepository) GetSeatSlots(ctx context.Context, seatID, date, userID string) ([]models.HourSlot, error) {
	const q = `
		SELECT start_hour, end_hour, user_id
		FROM bookings
		WHERE seat_id = $1
		  AND booking_date = $2
		  AND status <> 'cancelled'
	`

	type bookingRange struct {
		StartHour int    `db:"start_hour"`
		EndHour   int    `db:"end_hour"`
		UserID    string `db:"user_id"`
	}

	var ranges []bookingRange
	if err := r.db.SelectContext(ctx, &ranges, q, seatID, date); err != nil {
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
