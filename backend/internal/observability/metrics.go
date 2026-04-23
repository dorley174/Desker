package observability

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

// Metrics groups all application Prometheus metrics.
type Metrics struct {
	HTTPRequestsTotal       *prometheus.CounterVec
	HTTPRequestDuration     *prometheus.HistogramVec
	HTTPResponseSizeBytes   *prometheus.HistogramVec
	HTTPRequestsInFlight    prometheus.Gauge
	PanicRecoveredTotal     *prometheus.CounterVec
	RateLimitExceededTotal  prometheus.Counter
	RateLimitVisitorsActive prometheus.Gauge
	BookingsTotal           *prometheus.CounterVec
	AuthOperationsTotal     *prometheus.CounterVec
	SeatQueriesTotal        *prometheus.CounterVec

	registerer prometheus.Registerer
}

// New initializes and registers all app metrics and base runtime collectors.
func New(reg prometheus.Registerer) *Metrics {
	if reg == nil {
		reg = prometheus.NewRegistry()
	}

	m := &Metrics{
		HTTPRequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "http_requests_total",
				Help:      "Total number of processed HTTP requests.",
			},
			[]string{"method", "route", "status"},
		),
		HTTPRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "desker",
				Name:      "http_request_duration_seconds",
				Help:      "HTTP request latency in seconds.",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"method", "route", "status"},
		),
		HTTPResponseSizeBytes: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "desker",
				Name:      "http_response_size_bytes",
				Help:      "HTTP response body size in bytes.",
				Buckets:   []float64{100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000},
			},
			[]string{"method", "route", "status"},
		),
		HTTPRequestsInFlight: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: "desker",
				Name:      "http_requests_in_flight",
				Help:      "Current number of in-flight HTTP requests.",
			},
		),
		PanicRecoveredTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "http_panics_recovered_total",
				Help:      "Total number of recovered panics by route.",
			},
			[]string{"route"},
		),
		RateLimitExceededTotal: prometheus.NewCounter(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "rate_limit_exceeded_total",
				Help:      "Total number of requests rejected by rate limiting.",
			},
		),
		RateLimitVisitorsActive: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: "desker",
				Name:      "rate_limit_visitors_active",
				Help:      "Current number of tracked visitors in the rate limiter.",
			},
		),
		BookingsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "bookings_total",
				Help:      "Total booking operations grouped by operation and result.",
			},
			[]string{"operation", "result"},
		),
		AuthOperationsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "auth_operations_total",
				Help:      "Authentication operations grouped by operation and result.",
			},
			[]string{"operation", "result"},
		),
		SeatQueriesTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "desker",
				Name:      "seat_queries_total",
				Help:      "Seat and floor related queries grouped by operation and result.",
			},
			[]string{"operation", "result"},
		),
		registerer: reg,
	}

	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		m.HTTPRequestsTotal,
		m.HTTPRequestDuration,
		m.HTTPResponseSizeBytes,
		m.HTTPRequestsInFlight,
		m.PanicRecoveredTotal,
		m.RateLimitExceededTotal,
		m.RateLimitVisitorsActive,
		m.BookingsTotal,
		m.AuthOperationsTotal,
		m.SeatQueriesTotal,
	)

	return m
}

// ObserveHTTPRequest records request volume, latency, and response size.
func (m *Metrics) ObserveHTTPRequest(method, route string, status int, duration time.Duration, responseBytes int) {
	statusLabel := strconv.Itoa(status)
	m.HTTPRequestsTotal.WithLabelValues(method, route, statusLabel).Inc()
	m.HTTPRequestDuration.WithLabelValues(method, route, statusLabel).Observe(duration.Seconds())
	m.HTTPResponseSizeBytes.WithLabelValues(method, route, statusLabel).Observe(float64(responseBytes))
}

// RegisterDBStats exports sql.DB pool stats as gauges.
func (m *Metrics) RegisterDBStats(db *sql.DB) {
	if db == nil {
		return
	}

	m.registerer.MustRegister(
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_open_connections", Help: "Number of established DB connections."},
			func() float64 { return float64(db.Stats().OpenConnections) },
		),
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_in_use_connections", Help: "Number of DB connections currently in use."},
			func() float64 { return float64(db.Stats().InUse) },
		),
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_idle_connections", Help: "Number of idle DB connections."},
			func() float64 { return float64(db.Stats().Idle) },
		),
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_wait_count_total", Help: "Total waits for a DB connection from the pool."},
			func() float64 { return float64(db.Stats().WaitCount) },
		),
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_wait_duration_seconds", Help: "Total time blocked waiting for a DB connection."},
			func() float64 { return db.Stats().WaitDuration.Seconds() },
		),
		prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{Namespace: "desker", Name: "db_max_open_connections", Help: "Configured maximum number of open DB connections."},
			func() float64 { return float64(db.Stats().MaxOpenConnections) },
		),
	)
}
