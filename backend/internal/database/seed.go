package database

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/utils"
)

// SeedTestUsers inserts deterministic demo users for local development.
func SeedTestUsers(ctx context.Context, db *sqlx.DB) error {
	seedUsers := []struct {
		email     string
		password  string
		firstName string
		lastName  string
		role      models.UserRole
	}{
		{email: "admin@desker.io", password: "admin123", firstName: "Админ", lastName: "Десков", role: models.RoleAdmin},
		{email: "user@desker.io", password: "user123", firstName: "Иван", lastName: "Петров", role: models.RoleEmployee},
	}

	for _, item := range seedUsers {
		var exists bool
		if err := db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, item.email); err != nil {
			return err
		}
		if exists {
			continue
		}

		hash, err := utils.HashPassword(item.password)
		if err != nil {
			return err
		}

		now := time.Now().UTC()
		_, err = db.NamedExecContext(ctx, `
			INSERT INTO users (id, email, first_name, last_name, avatar_url, role, password_hash, created_at, updated_at)
			VALUES (:id, :email, :first_name, :last_name, :avatar_url, :role, :password_hash, :created_at, :updated_at)
		`, map[string]any{
			"id":            uuid.NewString(),
			"email":         item.email,
			"first_name":    item.firstName,
			"last_name":     item.lastName,
			"avatar_url":    nil,
			"role":          item.role,
			"password_hash": hash,
			"created_at":    now,
			"updated_at":    now,
		})
		if err != nil {
			return err
		}
	}

	return nil
}
