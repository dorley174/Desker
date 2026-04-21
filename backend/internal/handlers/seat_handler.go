package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/nov-o/desker/backend/internal/middleware"
	"github.com/nov-o/desker/backend/internal/observability"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

type SeatHandler struct {
	seats   *services.SeatService
	metrics *observability.Metrics
}

func NewSeatHandler(seats *services.SeatService, metrics *observability.Metrics) *SeatHandler {
	return &SeatHandler{seats: seats, metrics: metrics}
}

func (h *SeatHandler) Floors(w http.ResponseWriter, _ *http.Request) {
	h.observe("floors", "success")
	utils.WriteJSON(w, http.StatusOK, h.seats.Floors())
}

func (h *SeatHandler) EquipmentTags(w http.ResponseWriter, _ *http.Request) {
	h.observe("equipment_tags", "success")
	utils.WriteJSON(w, http.StatusOK, h.seats.EquipmentTags())
}

func (h *SeatHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	floor := 1
	if q.Get("floor") != "" {
		_, _ = fmt.Sscanf(q.Get("floor"), "%d", &floor)
	}
	date := q.Get("date")
	if strings.TrimSpace(date) == "" {
		date = time.Now().Format("2006-01-02")
	}
	tags := parseCSV(q.Get("tags"))
	status := q.Get("status")
	userID := middleware.UserIDFromContext(r.Context())

	seats, err := h.seats.ListSeats(r.Context(), floor, date, tags, status, userID)
	if err != nil {
		h.observe("list", "error")
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.observe("list", "success")
	utils.WriteJSON(w, http.StatusOK, seats)
}

func (h *SeatHandler) Slots(w http.ResponseWriter, r *http.Request) {
	seatID := chi.URLParam(r, "seatID")
	date := r.URL.Query().Get("date")
	if strings.TrimSpace(date) == "" {
		date = time.Now().Format("2006-01-02")
	}
	userID := middleware.UserIDFromContext(r.Context())

	slots, err := h.seats.SeatSlots(r.Context(), seatID, date, userID)
	if err != nil {
		h.observe("slots", "error")
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.observe("slots", "success")
	utils.WriteJSON(w, http.StatusOK, slots)
}

func parseCSV(v string) []string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (h *SeatHandler) observe(operation, result string) {
	if h.metrics == nil {
		return
	}
	h.metrics.SeatQueriesTotal.WithLabelValues(operation, result).Inc()
}
