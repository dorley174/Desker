package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/nov-o/desker/backend/internal/models"
)

// HistoryQueryParams controls booking history query behavior.
type HistoryQueryParams struct {
	Page      int
	PageSize  int
	Status    string
	SortBy    string
	SortOrder string
}

// BookingRepository defines booking persistence operations.
type BookingRepository interface {
	Create(ctx context.Context, booking *models.Booking) error
	Cancel(ctx context.Context, bookingID, userID string) error
	GetHistory(ctx context.Context, userID string, params HistoryQueryParams) ([]models.Booking, int, error)
}

type bookingRepository struct {
	db *sqlx.DB
}

func NewBookingRepository(db *sqlx.DB) BookingRepository {
	return &bookingRepository{db: db}
}

func (r *bookingRepository) Create(ctx context.Context, booking *models.Booking) error {
	const overlapQ = `
		SELECT EXISTS(
			SELECT 1
			FROM bookings
			WHERE seat_id = $1
			  AND booking_date = $2
			  AND status <> 'cancelled'
			  AND $3 < end_hour
			  AND $4 > start_hour
		)
	`
	var overlap bool
	if err := r.db.GetContext(ctx, &overlap, overlapQ, booking.SeatID, booking.Date, booking.StartHour, booking.EndHour); err != nil {
		return fmt.Errorf("check overlap: %w", err)
	}
	if overlap {
		return ErrConflict
	}

	booking.ID = uuid.NewString()
	booking.Status = models.BookingStatusActive
	now := time.Now().UTC()
	booking.CreatedAt = now
	booking.UpdatedAt = now

	const insertQ = `
		INSERT INTO bookings (id, user_id, seat_id, booking_date, start_hour, end_hour, status, created_at, updated_at)
		VALUES (:id, :user_id, :seat_id, :booking_date, :start_hour, :end_hour, :status, :created_at, :updated_at)
	`
	_, err := r.db.NamedExecContext(ctx, insertQ, booking)
	if err != nil {
		return fmt.Errorf("create booking: %w", err)
	}

	return nil
}

func (r *bookingRepository) Cancel(ctx context.Context, bookingID, userID string) error {
	const q = `
		UPDATE bookings
		SET status = 'cancelled', updated_at = $1
		WHERE id = $2 AND user_id = $3
	`
	res, err := r.db.ExecContext(ctx, q, time.Now().UTC(), bookingID, userID)
	if err != nil {
		return fmt.Errorf("cancel booking: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *bookingRepository) GetHistory(ctx context.Context, userID string, params HistoryQueryParams) ([]models.Booking, int, error) {
	sortBy := strings.ToLower(params.SortBy)
	if sortBy != "booking_date" && sortBy != "created_at" {
		sortBy = "booking_date"
	}
	sortOrder := strings.ToUpper(params.SortOrder)
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "DESC"
	}

	where := "WHERE b.user_id = $1"
	args := []any{userID}
	if params.Status != "" {
		where += " AND b.status = $2"
		args = append(args, params.Status)
	}

	countQ := "SELECT COUNT(*) FROM bookings b " + where
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count history: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	args = append(args, params.PageSize, offset)

	q := fmt.Sprintf(`
		SELECT
			b.id,
			b.user_id,
			b.seat_id,
			s.floor,
			s.seat_number,
			s.zone,
			b.booking_date,
			b.start_hour,
			b.end_hour,
			b.status,
			b.created_at,
			b.updated_at
		FROM bookings b
		JOIN seats s ON s.id = b.seat_id
		%s
		ORDER BY b.%s %s
		LIMIT $%d OFFSET $%d
	`, where, sortBy, sortOrder, len(args)-1, len(args))

	bookings := []models.Booking{}
	if err := r.db.SelectContext(ctx, &bookings, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Booking{}, total, nil
		}
		return nil, 0, fmt.Errorf("get history: %w", err)
	}

	return bookings, total, nil
}
