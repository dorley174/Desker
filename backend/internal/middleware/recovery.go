package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/nov-o/desker/backend/internal/observability"
	"github.com/nov-o/desker/backend/internal/utils"
)

// Recover catches panics and returns a safe 500 response.
func Recover(logger *slog.Logger, metrics *observability.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					route := r.URL.Path
					if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
						if pattern := routeContext.RoutePattern(); pattern != "" {
							route = pattern
						}
					}
					if metrics != nil {
						metrics.PanicRecoveredTotal.WithLabelValues(route).Inc()
					}

					logger.Error(
						"panic recovered",
						"panic", rec,
						"path", r.URL.Path,
						"route", route,
						"request_id", chimw.GetReqID(r.Context()),
						"stack", string(debug.Stack()),
					)
					utils.WriteError(w, http.StatusInternalServerError, "internal server error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
