package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

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
		if isUniqueViolation(err) {
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
		WHERE email = ?
	`
	var user models.User
	err := r.db.GetContext(ctx, &user, rebind(r.db, q), strings.ToLower(strings.TrimSpace(email)))
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
		WHERE id = ?
	`
	var user models.User
	err := r.db.GetContext(ctx, &user, rebind(r.db, q), id)
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
		WHERE code = ? AND is_active = 1
	`
	var role models.UserRole
	err := r.db.GetContext(ctx, &role, rebind(r.db, q), strings.ToUpper(strings.TrimSpace(code)))
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

	if firstName != nil {
		updates = append(updates, "first_name = ?")
		args = append(args, strings.TrimSpace(*firstName))
	}
	if lastName != nil {
		updates = append(updates, "last_name = ?")
		args = append(args, strings.TrimSpace(*lastName))
	}
	if passwordHash != nil {
		updates = append(updates, "password_hash = ?")
		args = append(args, *passwordHash)
	}
	updates = append(updates, "updated_at = ?")
	args = append(args, time.Now().UTC(), userID)

	q := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = ?
	`, strings.Join(updates, ", "))

	res, err := r.db.ExecContext(ctx, rebind(r.db, q), args...)
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
		WHERE email = ?
		  AND used_at IS NULL
		  AND expires_at > ?
		ORDER BY created_at DESC
		LIMIT 1
	`
	var code models.PasswordResetCode
	err := r.db.GetContext(ctx, &code, rebind(r.db, q), strings.ToLower(strings.TrimSpace(email)), time.Now().UTC())
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
		SET used_at = ?
		WHERE id = ?
	`
	res, err := r.db.ExecContext(ctx, rebind(r.db, q), time.Now().UTC(), id)
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
		SET password_hash = ?, updated_at = ?
		WHERE id = ?
	`
	res, err := r.db.ExecContext(ctx, rebind(r.db, q), passwordHash, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("update password by user id: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint") || strings.Contains(msg, "duplicate key")
}
