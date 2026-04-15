package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/utils"
)

// AuthService handles login/register/profile authentication flows.
type AuthService struct {
	users repositories.UserRepository
	jwt   *utils.JWTManager
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

func NewAuthService(users repositories.UserRepository, jwt *utils.JWTManager) *AuthService {
	return &AuthService{users: users, jwt: jwt}
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
