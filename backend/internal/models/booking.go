package models

import "time"

type SeatStatus string

type BookingStatus string

type SlotStatus string

const (
	SeatStatusFree        SeatStatus = "free"
	SeatStatusOccupied    SeatStatus = "occupied"
	SeatStatusMine        SeatStatus = "mine"
	SeatStatusUnavailable SeatStatus = "unavailable"

	BookingStatusCompleted BookingStatus = "completed"
	BookingStatusCancelled BookingStatus = "cancelled"
	BookingStatusNoShow    BookingStatus = "no-show"
	BookingStatusActive    BookingStatus = "active"

	SlotStatusFree     SlotStatus = "free"
	SlotStatusOccupied SlotStatus = "occupied"
	SlotStatusMine     SlotStatus = "mine"
)

// Seat maps to the frontend seat contract.
type Seat struct {
	ID     string     `db:"id" json:"id"`
	Number int        `db:"number" json:"number"`
	Zone   string     `db:"zone" json:"zone"`
	Floor  int        `db:"floor" json:"floor"`
	Tags   []string   `db:"tags" json:"tags"`
	Status SeatStatus `db:"status" json:"status"`
}

// HourSlot maps to the frontend slot contract.
type HourSlot struct {
	Hour   int        `json:"hour"`
	Status SlotStatus `json:"status"`
}

// Booking maps to the frontend booking history contract.
type Booking struct {
	ID         string        `db:"id" json:"id"`
	UserID     string        `db:"user_id" json:"-"`
	SeatID     string        `db:"seat_id" json:"seatId"`
	Floor      int           `db:"floor" json:"floor"`
	SeatNumber int           `db:"seat_number" json:"seatNumber"`
	Zone       string        `db:"zone" json:"zone"`
	Date       string        `db:"booking_date" json:"date"`
	StartHour  int           `db:"start_hour" json:"startHour"`
	EndHour    int           `db:"end_hour" json:"endHour"`
	Status     BookingStatus `db:"status" json:"status"`
	CreatedAt  time.Time     `db:"created_at" json:"createdAt"`
	UpdatedAt  time.Time     `db:"updated_at" json:"updatedAt"`
}
