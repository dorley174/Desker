package middleware

import (
	"log/slog"
	"net/http"
	"time"
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
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			lw := &loggingResponseWriter{ResponseWriter: w, status: http.StatusOK}

			next.ServeHTTP(lw, r)

			durationMs := time.Since(start).Milliseconds()
			attrs := []any{
				"method", r.Method,
				"path", r.URL.Path,
				"status", lw.status,
				"outcome", outcomeFromStatus(lw.status),
				"response_bytes", lw.bytes,
				"duration_ms", durationMs,
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
