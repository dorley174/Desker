package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/nov-o/desker/backend/internal/models"
)

// UserRepository defines user persistence operations.
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	GetRoleByInviteCode(ctx context.Context, code string) (models.UserRole, error)
	UpdateProfile(ctx context.Context, userID string, firstName, lastName *string, passwordHash *string) (*models.User, error)
}

type userRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	const q = `
		INSERT INTO users (id, email, first_name, last_name, avatar_url, role, password_hash, created_at, updated_at)
		VALUES (:id, :email, :first_name, :last_name, :avatar_url, :role, :password_hash, :created_at, :updated_at)
	`
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	_, err := r.db.NamedExecContext(ctx, q, user)
	if err != nil {
		if pgErr, ok := err.(*pq.Error); ok && pgErr.Code == "23505" {
			return ErrAlreadyExists
		}
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	const q = `
		SELECT id, email, first_name, last_name, avatar_url, role, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	var user models.User
	err := r.db.GetContext(ctx, &user, q, strings.ToLower(strings.TrimSpace(email)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	const q = `
		SELECT id, email, first_name, last_name, avatar_url, role, password_hash, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user models.User
	err := r.db.GetContext(ctx, &user, q, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetRoleByInviteCode(ctx context.Context, code string) (models.UserRole, error) {
	const q = `
		SELECT role
		FROM invite_codes
		WHERE code = $1 AND is_active = TRUE
	`
	var role models.UserRole
	err := r.db.GetContext(ctx, &role, q, strings.ToUpper(strings.TrimSpace(code)))
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrInvalidInvite
	}
	if err != nil {
		return "", fmt.Errorf("get invite code role: %w", err)
	}
	return role, nil
}

func (r *userRepository) UpdateProfile(ctx context.Context, userID string, firstName, lastName *string, passwordHash *string) (*models.User, error) {
	updates := []string{}
	args := []any{}
	idx := 1

	if firstName != nil {
		updates = append(updates, fmt.Sprintf("first_name = $%d", idx))
		args = append(args, strings.TrimSpace(*firstName))
		idx++
	}
	if lastName != nil {
		updates = append(updates, fmt.Sprintf("last_name = $%d", idx))
		args = append(args, strings.TrimSpace(*lastName))
		idx++
	}
	if passwordHash != nil {
		updates = append(updates, fmt.Sprintf("password_hash = $%d", idx))
		args = append(args, *passwordHash)
		idx++
	}
	updates = append(updates, fmt.Sprintf("updated_at = $%d", idx))
	args = append(args, time.Now().UTC())
	idx++
	args = append(args, userID)

	q := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
	`, strings.Join(updates, ", "), idx)

	res, err := r.db.ExecContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return nil, ErrNotFound
	}

	return r.GetByID(ctx, userID)
}
