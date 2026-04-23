package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/nov-o/desker/backend/internal/observability"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *loggingResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *loggingResponseWriter) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(data)
	w.bytes += n
	return n, err
}

// Logging logs request metadata and latency.
func Logging(logger *slog.Logger, metrics *observability.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			lw := &loggingResponseWriter{ResponseWriter: w, status: http.StatusOK}
			if metrics != nil {
				metrics.HTTPRequestsInFlight.Inc()
				defer metrics.HTTPRequestsInFlight.Dec()
			}

			next.ServeHTTP(lw, r)

			duration := time.Since(start)
			route := routeLabel(r)
			requestID := chimw.GetReqID(r.Context())
			attrs := []any{
				"method", r.Method,
				"path", r.URL.Path,
				"route", route,
				"request_id", requestID,
				"status", lw.status,
				"outcome", outcomeFromStatus(lw.status),
				"response_bytes", lw.bytes,
				"duration_ms", duration.Milliseconds(),
			}

			if metrics != nil {
				metrics.ObserveHTTPRequest(r.Method, route, lw.status, duration, lw.bytes)
			}

			switch {
			case lw.status >= 500:
				logger.Error("http request", attrs...)
			case lw.status >= 400:
				logger.Warn("http request", attrs...)
			default:
				logger.Info("http request", attrs...)
			}
		})
	}
}

func routeLabel(r *http.Request) string {
	if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
		if pattern := routeContext.RoutePattern(); pattern != "" {
			return pattern
		}
	}

	return r.URL.Path
}

func outcomeFromStatus(status int) string {
	switch {
	case status >= 500:
		return "server_error"
	case status >= 400:
		return "client_error"
	case status >= 300:
		return "redirect"
	default:
		return "success"
	}
}
