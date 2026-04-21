package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/utils"
)

// AuthService handles login/register/profile authentication flows.
type AuthService struct {
	users        repositories.UserRepository
	jwt          *utils.JWTManager
	email        utils.PasswordResetEmailSender
	resetCodeTTL time.Duration
}

type AuthResult struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

type RegisterInput struct {
	Email      string
	FirstName  string
	LastName   string
	Password   string
	InviteCode string
}

func NewAuthService(users repositories.UserRepository, jwt *utils.JWTManager, emailSender utils.PasswordResetEmailSender, resetCodeTTL time.Duration) *AuthService {
	if resetCodeTTL <= 0 {
		resetCodeTTL = 15 * time.Minute
	}
	return &AuthService{users: users, jwt: jwt, email: emailSender, resetCodeTTL: resetCodeTTL}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}

	if !utils.VerifyPassword(user.PasswordHash, password) {
		return nil, ErrUnauthorized
	}

	token, err := s.jwt.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		return nil, err
	}

	user.PasswordHash = ""
	return &AuthResult{Token: token, User: *user}, nil
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*AuthResult, error) {
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.FirstName = strings.TrimSpace(in.FirstName)
	in.LastName = strings.TrimSpace(in.LastName)

	if in.Email == "" || in.Password == "" || in.FirstName == "" || in.LastName == "" {
		return nil, ErrInvalidInput
	}

	role := models.RoleEmployee
	if strings.TrimSpace(in.InviteCode) != "" {
		r, err := s.users.GetRoleByInviteCode(ctx, in.InviteCode)
		if err != nil {
			if errors.Is(err, repositories.ErrInvalidInvite) {
				return nil, ErrInvalidInvite
			}
			return nil, err
		}
		role = r
	}

	hash, err := utils.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	user := &models.User{
		ID:           uuid.NewString(),
		Email:        in.Email,
		FirstName:    in.FirstName,
		LastName:     in.LastName,
		Role:         role,
		PasswordHash: hash,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.users.Create(ctx, user); err != nil {
		if errors.Is(err, repositories.ErrAlreadyExists) {
			return nil, ErrConflict
		}
		return nil, err
	}

	token, err := s.jwt.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		return nil, err
	}

	user.PasswordHash = ""
	return &AuthResult{Token: token, User: *user}, nil
}

func (s *AuthService) Me(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return ErrInvalidInput
	}

	user, err := s.users.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil
		}
		return err
	}

	code, err := generateNumericCode(6)
	if err != nil {
		return err
	}

	codeHash, err := utils.HashPassword(code)
	if err != nil {
		return err
	}

	resetCode := &models.PasswordResetCode{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		Email:     normalizedEmail,
		CodeHash:  codeHash,
		ExpiresAt: time.Now().UTC().Add(s.resetCodeTTL),
		CreatedAt: time.Now().UTC(),
	}
	if err := s.users.CreatePasswordResetCode(ctx, resetCode); err != nil {
		return err
	}

	if s.email == nil {
		fmt.Printf("[dev-mailer] password reset code for %s: %s\n", normalizedEmail, code)
		return nil
	}
	if err := s.email.SendPasswordResetCode(ctx, normalizedEmail, code); err != nil {
		return err
	}

	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, email, code, newPassword string) error {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	trimmedCode := strings.TrimSpace(code)
	if normalizedEmail == "" || trimmedCode == "" || strings.TrimSpace(newPassword) == "" || len(newPassword) < 6 {
		return ErrInvalidInput
	}

	resetCode, err := s.users.GetLatestActivePasswordResetCode(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return ErrUnauthorized
		}
		return err
	}

	if !utils.VerifyPassword(resetCode.CodeHash, trimmedCode) {
		return ErrUnauthorized
	}

	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	if err := s.users.UpdatePasswordByUserID(ctx, resetCode.UserID, hash); err != nil {
		return err
	}
	if err := s.users.MarkPasswordResetCodeUsed(ctx, resetCode.ID); err != nil {
		return err
	}

	return nil
}

func generateNumericCode(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("invalid code length")
	}
	out := make([]byte, length)
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		out[i] = byte('0' + n.Int64())
	}
	return string(out), nil
}
