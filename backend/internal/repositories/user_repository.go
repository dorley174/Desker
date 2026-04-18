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
	CreatePasswordResetCode(ctx context.Context, code *models.PasswordResetCode) error
	GetLatestActivePasswordResetCode(ctx context.Context, email string) (*models.PasswordResetCode, error)
	MarkPasswordResetCodeUsed(ctx context.Context, id string) error
	UpdatePasswordByUserID(ctx context.Context, userID, passwordHash string) error
}

type userRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	const q = `
		INSERT INTO users (id, email, first_name, last_name, role, password_hash, created_at, updated_at)
		VALUES (:id, :email, :first_name, :last_name, :role, :password_hash, :created_at, :updated_at)
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
		SELECT id, email, first_name, last_name, role, password_hash, created_at, updated_at
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
		SELECT id, email, first_name, last_name, role, password_hash, created_at, updated_at
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

func (r *userRepository) CreatePasswordResetCode(ctx context.Context, code *models.PasswordResetCode) error {
	const q = `
		INSERT INTO password_reset_codes (id, user_id, email, code_hash, expires_at, used_at, created_at)
		VALUES (:id, :user_id, :email, :code_hash, :expires_at, :used_at, :created_at)
	`
	_, err := r.db.NamedExecContext(ctx, q, code)
	if err != nil {
		return fmt.Errorf("create password reset code: %w", err)
	}
	return nil
}

func (r *userRepository) GetLatestActivePasswordResetCode(ctx context.Context, email string) (*models.PasswordResetCode, error) {
	const q = `
		SELECT id, user_id, email, code_hash, expires_at, used_at, created_at
		FROM password_reset_codes
		WHERE email = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`
	var code models.PasswordResetCode
	err := r.db.GetContext(ctx, &code, q, strings.ToLower(strings.TrimSpace(email)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get active reset code: %w", err)
	}
	return &code, nil
}

func (r *userRepository) MarkPasswordResetCodeUsed(ctx context.Context, id string) error {
	const q = `
		UPDATE password_reset_codes
		SET used_at = $1
		WHERE id = $2
	`
	res, err := r.db.ExecContext(ctx, q, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("mark reset code used: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *userRepository) UpdatePasswordByUserID(ctx context.Context, userID, passwordHash string) error {
	const q = `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`
	res, err := r.db.ExecContext(ctx, q, passwordHash, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("update password by user id: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}
