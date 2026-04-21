package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/utils"
)

type fakeUserRepo struct {
	usersByEmail map[string]*models.User
	usersByID    map[string]*models.User
	inviteRoles  map[string]models.UserRole
	createErr    error
}

func (f *fakeUserRepo) Create(_ context.Context, user *models.User) error {
	if f.createErr != nil {
		return f.createErr
	}
	if _, ok := f.usersByEmail[user.Email]; ok {
		return repositories.ErrAlreadyExists
	}
	f.usersByEmail[user.Email] = user
	f.usersByID[user.ID] = user
	return nil
}

func (f *fakeUserRepo) GetByEmail(_ context.Context, email string) (*models.User, error) {
	u, ok := f.usersByEmail[email]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return u, nil
}

func (f *fakeUserRepo) GetByID(_ context.Context, id string) (*models.User, error) {
	u, ok := f.usersByID[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return u, nil
}

func (f *fakeUserRepo) GetRoleByInviteCode(_ context.Context, code string) (models.UserRole, error) {
	if role, ok := f.inviteRoles[code]; ok {
		return role, nil
	}
	return "", repositories.ErrInvalidInvite
}

func (f *fakeUserRepo) UpdateProfile(_ context.Context, userID string, firstName, lastName *string, _ *string) (*models.User, error) {
	u, ok := f.usersByID[userID]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	if firstName != nil {
		u.FirstName = *firstName
	}
	if lastName != nil {
		u.LastName = *lastName
	}
	return u, nil
}

func (f *fakeUserRepo) CreatePasswordResetCode(_ context.Context, _ *models.PasswordResetCode) error {
	return nil
}

func (f *fakeUserRepo) GetLatestActivePasswordResetCode(_ context.Context, _ string) (*models.PasswordResetCode, error) {
	return nil, repositories.ErrNotFound
}

func (f *fakeUserRepo) MarkPasswordResetCodeUsed(_ context.Context, _ string) error {
	return nil
}

func (f *fakeUserRepo) UpdatePasswordByUserID(_ context.Context, _ string, _ string) error {
	return nil
}

func TestAuthServiceLoginSuccess(t *testing.T) {
	hash, err := utils.HashPassword("secret123")
	if err != nil {
		t.Fatal(err)
	}
	repo := &fakeUserRepo{
		usersByEmail: map[string]*models.User{
			"user@desker.io": {ID: "u1", Email: "user@desker.io", PasswordHash: hash, Role: models.RoleEmployee},
		},
		usersByID:   map[string]*models.User{},
		inviteRoles: map[string]models.UserRole{},
	}
	svc := NewAuthService(repo, utils.NewJWTManager("secret", time.Hour), nil, 15*time.Minute)

	res, err := svc.Login(context.Background(), "user@desker.io", "secret123")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if res.Token == "" {
		t.Fatal("expected token")
	}
	if res.User.ID != "u1" {
		t.Fatalf("expected user id u1, got %s", res.User.ID)
	}
}

func TestAuthServiceRegisterInvalidInvite(t *testing.T) {
	repo := &fakeUserRepo{
		usersByEmail: map[string]*models.User{},
		usersByID:    map[string]*models.User{},
		inviteRoles:  map[string]models.UserRole{"JOIN2026": models.RoleEmployee},
	}
	svc := NewAuthService(repo, utils.NewJWTManager("secret", time.Hour), nil, 15*time.Minute)

	_, err := svc.Register(context.Background(), RegisterInput{
		Email:      "new@desker.io",
		FirstName:  "Ivan",
		LastName:   "Petrov",
		Password:   "password123",
		InviteCode: "INVALID",
	})
	if !errors.Is(err, ErrInvalidInvite) {
		t.Fatalf("expected ErrInvalidInvite, got %v", err)
	}
}
