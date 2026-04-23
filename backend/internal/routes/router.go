package routes

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/nov-o/desker/backend/internal/handlers"
	appmw "github.com/nov-o/desker/backend/internal/middleware"
	"github.com/nov-o/desker/backend/internal/observability"
	"github.com/nov-o/desker/backend/internal/utils"
)

type Dependencies struct {
	JWT                  *utils.JWTManager
	AllowedOrigins       []string
	AllowCredentialsCORS bool
	RateLimitPerMinute   int
	RateLimitBurst       int
	HealthHandler        *handlers.HealthHandler
	AuthHandler          *handlers.AuthHandler
	UserHandler          *handlers.UserHandler
	SeatHandler          *handlers.SeatHandler
	BookingHandler       *handlers.BookingHandler
	Logger               *slog.Logger
	Metrics              *observability.Metrics
	MetricsHandler       http.Handler
}

func NewRouter(deps Dependencies) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(appmw.Recover(deps.Logger, deps.Metrics))
	r.Use(appmw.Logging(deps.Logger, deps.Metrics))
	r.Use(appmw.SecurityHeaders)
	r.Use(appmw.RateLimit(deps.RateLimitPerMinute, deps.RateLimitBurst, deps.Metrics))
	r.Use(appmw.CORS(deps.AllowedOrigins, deps.AllowCredentialsCORS))

	r.Get("/healthz", deps.HealthHandler.Liveness)
	if deps.MetricsHandler != nil {
		r.Handle("/metrics", deps.MetricsHandler)
	}

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/login", deps.AuthHandler.Login)
		r.Post("/auth/register", deps.AuthHandler.Register)
		r.Post("/auth/forgot-password", deps.AuthHandler.ForgotPassword)
		r.Post("/auth/reset-password", deps.AuthHandler.ResetPassword)

		r.Group(func(r chi.Router) {
			r.Use(appmw.Auth(deps.JWT))
			r.Get("/auth/me", deps.AuthHandler.Me)
			r.Put("/users/me", deps.UserHandler.UpdateMe)

			r.Get("/floors", deps.SeatHandler.Floors)
			r.Get("/equipment-tags", deps.SeatHandler.EquipmentTags)
			r.Get("/seats", deps.SeatHandler.List)
			r.Get("/seats/{seatID}/slots", deps.SeatHandler.Slots)
			r.Patch("/admin/seats/{seatID}/availability", deps.SeatHandler.UpdateAvailability)

			r.Post("/bookings", deps.BookingHandler.Create)
			r.Delete("/bookings/{bookingID}", deps.BookingHandler.Cancel)
			r.Get("/bookings/history", deps.BookingHandler.History)
		})
	})

	return r
}
