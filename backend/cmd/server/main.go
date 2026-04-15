package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nov-o/desker/backend/internal/config"
	"github.com/nov-o/desker/backend/internal/database"
	"github.com/nov-o/desker/backend/internal/handlers"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/routes"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	db, err := database.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect db", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := database.RunMigrations(ctx, db, cfg.MigrationsDir); err != nil {
		logger.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	if err := database.SeedTestUsers(ctx, db); err != nil {
		logger.Error("failed to seed test users", "error", err)
		os.Exit(1)
	}

	jwt := utils.NewJWTManager(cfg.JWTSecret, cfg.JWTTTL)

	userRepo := repositories.NewUserRepository(db)
	seatRepo := repositories.NewSeatRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)

	authService := services.NewAuthService(userRepo, jwt)
	userService := services.NewUserService(userRepo)
	seatService := services.NewSeatService(seatRepo)
	bookingService := services.NewBookingService(bookingRepo)

	healthHandler := handlers.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	seatHandler := handlers.NewSeatHandler(seatService)
	bookingHandler := handlers.NewBookingHandler(bookingService)

	router := routes.NewRouter(routes.Dependencies{
		JWT:                  jwt,
		AllowedOrigins:       cfg.AllowedOrigins,
		AllowCredentialsCORS: cfg.AllowCredentialsCORS,
		RateLimitPerMinute:   cfg.RateLimitPerMinute,
		RateLimitBurst:       cfg.RateLimitBurst,
		HealthHandler:        healthHandler,
		AuthHandler:          authHandler,
		UserHandler:          userHandler,
		SeatHandler:          seatHandler,
		BookingHandler:       bookingHandler,
		Logger:               logger,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("server starting", "port", cfg.Port)
		errCh <- srv.ListenAndServe()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info("shutdown signal received", "signal", sig.String())
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "error", err)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		_ = srv.Close()
	}

	time.Sleep(100 * time.Millisecond)
	logger.Info("server stopped")
}
