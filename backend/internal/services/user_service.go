package services

import (
	"context"
	"errors"
	"strings"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/utils"
)

type UserService struct {
	users repositories.UserRepository
}

func NewUserService(users repositories.UserRepository) *UserService {
	return &UserService{users: users}
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, firstName, lastName, password *string) (*models.User, error) {
	var firstNamePtr *string
	var lastNamePtr *string
	var passwordHashPtr *string

	if firstName != nil && strings.TrimSpace(*firstName) != "" {
		trim := strings.TrimSpace(*firstName)
		firstNamePtr = &trim
	}
	if lastName != nil && strings.TrimSpace(*lastName) != "" {
		trim := strings.TrimSpace(*lastName)
		lastNamePtr = &trim
	}
	if password != nil && strings.TrimSpace(*password) != "" {
		hash, err := utils.HashPassword(*password)
		if err != nil {
			return nil, err
		}
		passwordHashPtr = &hash
	}

	if firstNamePtr == nil && lastNamePtr == nil && passwordHashPtr == nil {
		return nil, ErrInvalidInput
	}

	user, err := s.users.UpdateProfile(ctx, userID, firstNamePtr, lastNamePtr, passwordHashPtr)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}
