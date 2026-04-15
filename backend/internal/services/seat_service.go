package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
)

var defaultEquipmentTags = []string{
	"Принтер",
	"Доска",
	"2+ мониторов",
	"ТВ-панель",
	"Кондиционер",
	"Тихая зона",
}

type SeatService struct {
	seats repositories.SeatRepository
}

func NewSeatService(seats repositories.SeatRepository) *SeatService {
	return &SeatService{seats: seats}
}

func (s *SeatService) Floors() []int {
	return []int{1, 2, 3, 4, 5, 6}
}

func (s *SeatService) EquipmentTags() []string {
	return defaultEquipmentTags
}

func (s *SeatService) ListSeats(ctx context.Context, floor int, date string, tags []string, statusFilter string, userID string) ([]models.Seat, error) {
	if floor < 1 || floor > 6 {
		return nil, fmt.Errorf("%w: invalid floor", ErrInvalidInput)
	}
	statusFilter = strings.ToLower(strings.TrimSpace(statusFilter))
	if statusFilter == "" {
		statusFilter = "all"
	}
	if statusFilter != "all" && statusFilter != "free" && statusFilter != "occupied" {
		return nil, fmt.Errorf("%w: invalid status filter", ErrInvalidInput)
	}
	return s.seats.ListSeats(ctx, repositories.SeatFilter{
		Floor:        floor,
		Date:         date,
		Tags:         tags,
		StatusFilter: statusFilter,
		UserID:       userID,
	})
}

func (s *SeatService) SeatSlots(ctx context.Context, seatID, date, userID string) ([]models.HourSlot, error) {
	if strings.TrimSpace(seatID) == "" {
		return nil, fmt.Errorf("%w: seatID is required", ErrInvalidInput)
	}
	return s.seats.GetSeatSlots(ctx, seatID, date, userID)
}
