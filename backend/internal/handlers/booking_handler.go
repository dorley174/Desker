package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/nov-o/desker/backend/internal/middleware"
	"github.com/nov-o/desker/backend/internal/observability"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

type BookingHandler struct {
	bookings *services.BookingService
	metrics  *observability.Metrics
}

func NewBookingHandler(bookings *services.BookingService, metrics *observability.Metrics) *BookingHandler {
	return &BookingHandler{bookings: bookings, metrics: metrics}
}

func (h *BookingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req services.CreateBookingInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	userID := middleware.UserIDFromContext(r.Context())

	created, err := h.bookings.Create(r.Context(), userID, req)
	if err != nil {
		h.observe("create", "error")
		switch {
		case errors.Is(err, services.ErrInvalidInput):
			utils.WriteError(w, http.StatusBadRequest, "invalid booking input")
		case errors.Is(err, services.ErrConflict):
			utils.WriteError(w, http.StatusConflict, "selected slot is no longer available")
		default:
			utils.WriteError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}
	h.observe("create", "success")
	utils.WriteJSON(w, http.StatusCreated, map[string]any{"items": created})
}

func (h *BookingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "bookingID")
	userID := middleware.UserIDFromContext(r.Context())

	if err := h.bookings.Cancel(r.Context(), userID, bookingID); err != nil {
		h.observe("cancel", "error")
		if errors.Is(err, services.ErrNotFound) {
			utils.WriteError(w, http.StatusNotFound, "booking not found")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	h.observe("cancel", "success")
	utils.WriteJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (h *BookingHandler) History(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	status := q.Get("status")
	sortBy := q.Get("sortBy")
	sortOrder := q.Get("sortOrder")

	userID := middleware.UserIDFromContext(r.Context())
	res, err := h.bookings.History(r.Context(), userID, page, pageSize, status, sortBy, sortOrder)
	if err != nil {
		h.observe("history", "error")
		utils.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	h.observe("history", "success")
	utils.WriteJSON(w, http.StatusOK, res)
}

func (h *BookingHandler) observe(operation, result string) {
	if h.metrics == nil {
		return
	}
	h.metrics.BookingsTotal.WithLabelValues(operation, result).Inc()
}
