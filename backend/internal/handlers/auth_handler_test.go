package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/nov-o/desker/backend/internal/models"
	"github.com/nov-o/desker/backend/internal/repositories"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

func TestAuthHandlerLoginValidation(t *testing.T) {
	repo := &fakeRepoForHandler{}
	authSvc := services.NewAuthService(repo, utils.NewJWTManager("secret", time.Hour), nil, 15*time.Minute)
	h := NewAuthHandler(authSvc, nil)

	body := []byte(`{"email":"bad","password":"123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

// fakeRepoForHandler intentionally returns not found for all users.
type fakeRepoForHandler struct{}

func (f *fakeRepoForHandler) Create(_ context.Context, _ *models.User) error { return nil }
func (f *fakeRepoForHandler) GetByEmail(_ context.Context, _ string) (*models.User, error) {
	return nil, repositories.ErrNotFound
}
func (f *fakeRepoForHandler) GetByID(_ context.Context, _ string) (*models.User, error) {
	return nil, repositories.ErrNotFound
}
func (f *fakeRepoForHandler) GetRoleByInviteCode(_ context.Context, _ string) (models.UserRole, error) {
	return "", repositories.ErrInvalidInvite
}
func (f *fakeRepoForHandler) UpdateProfile(_ context.Context, _ string, _ *string, _ *string, _ *string) (*models.User, error) {
	return nil, repositories.ErrNotFound
}
func (f *fakeRepoForHandler) CreatePasswordResetCode(_ context.Context, _ *models.PasswordResetCode) error {
	return nil
}
func (f *fakeRepoForHandler) GetLatestActivePasswordResetCode(_ context.Context, _ string) (*models.PasswordResetCode, error) {
	return nil, repositories.ErrNotFound
}
func (f *fakeRepoForHandler) MarkPasswordResetCodeUsed(_ context.Context, _ string) error {
	return nil
}
func (f *fakeRepoForHandler) UpdatePasswordByUserID(_ context.Context, _ string, _ string) error {
	return repositories.ErrNotFound
}
