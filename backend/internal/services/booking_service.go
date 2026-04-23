package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
)

type BookingService struct {
	bookings repositories.BookingRepository
}

type CreateBookingInput struct {
	SeatID    string `json:"seatId"`
	Date      string `json:"date"`
	StartHour int    `json:"startHour"`
	EndHour   int    `json:"endHour"`
	Hours     []int  `json:"hours"`
}

type HistoryResult struct {
	Items    []models.Booking `json:"items"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
}

func NewBookingService(bookings repositories.BookingRepository) *BookingService {
	return &BookingService{bookings: bookings}
}

func (s *BookingService) Create(ctx context.Context, userID string, in CreateBookingInput) ([]models.Booking, error) {
	in.SeatID = strings.TrimSpace(in.SeatID)
	in.Date = strings.TrimSpace(in.Date)
	if in.SeatID == "" || in.Date == "" {
		return nil, ErrInvalidInput
	}
	if _, err := time.Parse("2006-01-02", in.Date); err != nil {
		return nil, ErrInvalidInput
	}

	windows, err := extractWindows(in)
	if err != nil {
		return nil, err
	}

	created := make([]models.Booking, 0, len(windows))
	for _, w := range windows {
		b := models.Booking{
			UserID:    userID,
			SeatID:    in.SeatID,
			Date:      in.Date,
			StartHour: w[0],
			EndHour:   w[1],
		}
		if err := s.bookings.Create(ctx, &b); err != nil {
			if errors.Is(err, repositories.ErrConflict) {
				return nil, ErrConflict
			}
			return nil, err
		}
		created = append(created, b)
	}
	return created, nil
}

func (s *BookingService) Cancel(ctx context.Context, userID, bookingID string) error {
	err := s.bookings.Cancel(ctx, bookingID, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *BookingService) History(ctx context.Context, userID string, page, pageSize int, status, sortBy, sortOrder string) (*HistoryResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	items, total, err := s.bookings.GetHistory(ctx, userID, repositories.HistoryQueryParams{
		Page:      page,
		PageSize:  pageSize,
		Status:    status,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	})
	if err != nil {
		return nil, err
	}
	return &HistoryResult{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

func extractWindows(in CreateBookingInput) ([][2]int, error) {
	if len(in.Hours) > 0 {
		hours := append([]int(nil), in.Hours...)
		sort.Ints(hours)
		uniq := make([]int, 0, len(hours))
		for i, h := range hours {
			if h < 8 || h > 19 {
				return nil, ErrInvalidInput
			}
			if i == 0 || h != hours[i-1] {
				uniq = append(uniq, h)
			}
		}
		if len(uniq) == 0 {
			return nil, ErrInvalidInput
		}
		windows := make([][2]int, 0)
		start := uniq[0]
		prev := uniq[0]
		for i := 1; i < len(uniq); i++ {
			if uniq[i] == prev+1 {
				prev = uniq[i]
				continue
			}
			windows = append(windows, [2]int{start, prev + 1})
			start = uniq[i]
			prev = uniq[i]
		}
		windows = append(windows, [2]int{start, prev + 1})
		return windows, nil
	}

	if in.StartHour < 8 || in.EndHour > 20 || in.StartHour >= in.EndHour {
		return nil, fmt.Errorf("%w: invalid booking window", ErrInvalidInput)
	}
	return [][2]int{{in.StartHour, in.EndHour}}, nil
}
