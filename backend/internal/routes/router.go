package routes

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/nov-o/desker/backend/internal/handlers"
	appmw "github.com/nov-o/desker/backend/internal/middleware"
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
}

func NewRouter(deps Dependencies) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(appmw.Recover(deps.Logger))
	r.Use(appmw.Logging(deps.Logger))
	r.Use(appmw.SecurityHeaders)
	r.Use(appmw.RateLimit(deps.RateLimitPerMinute, deps.RateLimitBurst))
	r.Use(appmw.CORS(deps.AllowedOrigins, deps.AllowCredentialsCORS))

	r.Get("/healthz", deps.HealthHandler.Liveness)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/login", deps.AuthHandler.Login)
		r.Post("/auth/register", deps.AuthHandler.Register)
		r.Post("/auth/forgot-password", deps.AuthHandler.ForgotPassword)

		r.Group(func(r chi.Router) {
			r.Use(appmw.Auth(deps.JWT))
			r.Get("/auth/me", deps.AuthHandler.Me)
			r.Put("/users/me", deps.UserHandler.UpdateMe)

			r.Get("/floors", deps.SeatHandler.Floors)
			r.Get("/equipment-tags", deps.SeatHandler.EquipmentTags)
			r.Get("/seats", deps.SeatHandler.List)
			r.Get("/seats/{seatID}/slots", deps.SeatHandler.Slots)

			r.Post("/bookings", deps.BookingHandler.Create)
			r.Delete("/bookings/{bookingID}", deps.BookingHandler.Cancel)
			r.Get("/bookings/history", deps.BookingHandler.History)
		})
	})

	return r
}
