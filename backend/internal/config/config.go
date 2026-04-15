package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config stores runtime settings loaded from environment variables.
type Config struct {
	AppEnv               string
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	JWTTTL               time.Duration
	AllowedOrigins       []string
	MigrationsDir        string
	RateLimitPerMinute   int
	RateLimitBurst       int
	ShutdownTimeout      time.Duration
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
	IdleTimeout          time.Duration
	AllowCredentialsCORS bool
}

// Load parses config from environment variables and applies sensible defaults.
func Load() (Config, error) {
	cfg := Config{
		AppEnv:               getenv("APP_ENV", "development"),
		Port:                 getenv("PORT", "8080"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		JWTSecret:            os.Getenv("JWT_SECRET"),
		MigrationsDir:        getenv("MIGRATIONS_DIR", "./migrations"),
		AllowedOrigins:       splitCSV(getenv("ALLOWED_ORIGINS", "http://localhost:5173")),
		RateLimitPerMinute:   getenvInt("RATE_LIMIT_PER_MINUTE", 120),
		RateLimitBurst:       getenvInt("RATE_LIMIT_BURST", 60),
		ShutdownTimeout:      getenvDuration("SHUTDOWN_TIMEOUT", 15*time.Second),
		ReadTimeout:          getenvDuration("READ_TIMEOUT", 10*time.Second),
		WriteTimeout:         getenvDuration("WRITE_TIMEOUT", 15*time.Second),
		IdleTimeout:          getenvDuration("IDLE_TIMEOUT", 60*time.Second),
		AllowCredentialsCORS: getenvBool("CORS_ALLOW_CREDENTIALS", true),
	}

	cfg.JWTTTL = getenvDuration("JWT_TTL", 24*time.Hour)

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getenvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func getenvDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(v string) []string {
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
