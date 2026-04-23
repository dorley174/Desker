package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/utils"
)

var seatTagPool = []string{
	"Принтер",
	"Доска",
	"2+ мониторов",
	"ТВ-панель",
	"Кондиционер",
	"Тихая зона",
}

// SeedReferenceData inserts deterministic invite codes and seats for local/dev usage.
func SeedReferenceData(ctx context.Context, db *sqlx.DB) error {
	if _, err := db.ExecContext(ctx, `
		INSERT INTO invite_codes (code, role, is_active, created_at)
		VALUES
			('ADMIN2026', 'admin', 1, CURRENT_TIMESTAMP),
			('JOIN2026', 'employee', 1, CURRENT_TIMESTAMP)
		ON CONFLICT(code) DO NOTHING
	`); err != nil {
		return fmt.Errorf("seed invite codes: %w", err)
	}

	var seatsCount int
	if err := db.GetContext(ctx, &seatsCount, `SELECT COUNT(*) FROM seats`); err != nil {
		return fmt.Errorf("count seats: %w", err)
	}
	if seatsCount > 0 {
		return nil
	}

	now := time.Now().UTC()
	zones := []string{"A", "B", "C", "D"}
	insertSeatQ := db.Rebind(`
		INSERT INTO seats (id, floor, seat_number, zone, tags, is_available, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`)
	for floor := 1; floor <= 6; floor++ {
		seatNumber := 1
		for _, zone := range zones {
			for zoneSeat := 1; zoneSeat <= 8; zoneSeat++ {
				seatID := uuid.NewSHA1(uuid.Nil, []byte(fmt.Sprintf("seat-%d-%s-%d", floor, zone, zoneSeat))).String()
				tagsJSON, err := json.Marshal(deterministicSeatTags(floor, zone, zoneSeat))
				if err != nil {
					return fmt.Errorf("marshal seat tags: %w", err)
				}
				isAvailable := 1
				if (floor+zoneSeat+len(zone))%11 == 0 {
					isAvailable = 0
				}
				if _, err := db.ExecContext(ctx, insertSeatQ, seatID, floor, seatNumber, zone, string(tagsJSON), isAvailable, now); err != nil {
					return fmt.Errorf("seed seat %s: %w", seatID, err)
				}
				seatNumber++
			}
		}
	}

	return nil
}

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

	selectExistsQ := db.Rebind(`SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)`)
	insertUserQ := db.Rebind(`
		INSERT INTO users (id, email, first_name, last_name, role, password_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)

	for _, item := range seedUsers {
		var exists bool
		if err := db.GetContext(ctx, &exists, selectExistsQ, item.email); err != nil {
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
		_, err = db.ExecContext(ctx, insertUserQ, uuid.NewString(), item.email, item.firstName, item.lastName, item.role, hash, now, now)
		if err != nil {
			return err
		}
	}

	return nil
}

func deterministicSeatTags(floor int, zone string, zoneSeat int) []string {
	seed := floor*10 + int(zone[0]) + zoneSeat*3
	tags := make([]string, 0, 3)
	for idx, tag := range seatTagPool {
		if (seed+idx*2)%4 == 0 {
			tags = append(tags, tag)
		}
		if len(tags) == 3 {
			break
		}
	}
	if len(tags) == 0 {
		tags = append(tags, seatTagPool[seed%len(seatTagPool)])
	}
	return tags
}
