package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/nov-o/desker/backend/internal/observability"
	"github.com/nov-o/desker/backend/internal/utils"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimit applies per-IP token bucket throttling.
func RateLimit(requestsPerMinute int, burst int, metrics *observability.Metrics) func(http.Handler) http.Handler {
	if requestsPerMinute <= 0 {
		requestsPerMinute = 1
	}
	if burst <= 0 {
		burst = 1
	}

	var (
		mu       sync.Mutex
		visitors = map[string]*visitor{}
	)

	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(visitors, ip)
				}
			}
			if metrics != nil {
				metrics.RateLimitVisitorsActive.Set(float64(len(visitors)))
			}
			mu.Unlock()
		}
	}()

	getLimiter := func(ip string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		v, ok := visitors[ip]
		if !ok {
			l := rate.NewLimiter(rate.Every(time.Minute/time.Duration(requestsPerMinute)), burst)
			visitors[ip] = &visitor{limiter: l, lastSeen: time.Now()}
			if metrics != nil {
				metrics.RateLimitVisitorsActive.Set(float64(len(visitors)))
			}
			return l
		}
		v.lastSeen = time.Now()
		return v.limiter
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			if !getLimiter(ip).Allow() {
				if metrics != nil {
					metrics.RateLimitExceededTotal.Inc()
				}
				utils.WriteError(w, http.StatusTooManyRequests, "rate limit exceeded")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
