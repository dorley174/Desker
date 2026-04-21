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
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin booking tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	const overlapQ = `
		SELECT EXISTS(
			SELECT 1
			FROM bookings
			WHERE seat_id = ?
			  AND booking_date = ?
			  AND status = 'active'
			  AND ? < end_hour
			  AND ? > start_hour
		)
	`
	var overlap bool
	if err := tx.GetContext(ctx, &overlap, rebind(r.db, overlapQ), booking.SeatID, booking.Date, booking.StartHour, booking.EndHour); err != nil {
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
	if _, err := tx.NamedExecContext(ctx, insertQ, booking); err != nil {
		return fmt.Errorf("create booking: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit booking tx: %w", err)
	}
	return nil
}

func (r *bookingRepository) Cancel(ctx context.Context, bookingID, userID string) error {
	const q = `
		UPDATE bookings
		SET status = 'cancelled', updated_at = ?
		WHERE id = ? AND user_id = ?
	`
	res, err := r.db.ExecContext(ctx, rebind(r.db, q), time.Now().UTC(), bookingID, userID)
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

	statusFilter := strings.TrimSpace(params.Status)
	where := "WHERE b.user_id = ?"
	args := []any{userID}
	countArgs := []any{userID}
	if statusFilter != "" {
		where += " AND b.status = ?"
		args = append(args, statusFilter)
		countArgs = append(countArgs, statusFilter)
	}

	countQ := "SELECT COUNT(*) FROM bookings b " + where
	var total int
	if err := r.db.GetContext(ctx, &total, rebind(r.db, countQ), countArgs...); err != nil {
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
		LIMIT ? OFFSET ?
	`, where, sortBy, sortOrder)

	bookings := []models.Booking{}
	if err := r.db.SelectContext(ctx, &bookings, rebind(r.db, q), args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Booking{}, total, nil
		}
		return nil, 0, fmt.Errorf("get history: %w", err)
	}

	now := time.Now()
	for idx := range bookings {
		bookings[idx].Status = normalizeBookingStatus(bookings[idx].Date, bookings[idx].EndHour, bookings[idx].Status, now)
	}

	return bookings, total, nil
}
