package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/nov-o/desker/backend/internal/middleware"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

type AuthHandler struct {
	auth *services.AuthService
}

func NewAuthHandler(auth *services.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type registerRequest struct {
	Email      string `json:"email" validate:"required,email"`
	FirstName  string `json:"firstName" validate:"required"`
	LastName   string `json:"lastName" validate:"required"`
	Password   string `json:"password" validate:"required,min=6"`
	InviteCode string `json:"inviteCode"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type resetPasswordRequest struct {
	Email       string `json:"email" validate:"required,email"`
	Code        string `json:"code" validate:"required,len=6,numeric"`
	NewPassword string `json:"newPassword" validate:"required,min=6"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if err := utils.ValidateStruct(req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	res, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, res)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if err := utils.ValidateStruct(req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	res, err := h.auth.Register(r.Context(), services.RegisterInput{
		Email:      req.Email,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Password:   req.Password,
		InviteCode: req.InviteCode,
	})
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusCreated, res)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if err := utils.ValidateStruct(req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.auth.ForgotPassword(r.Context(), req.Email); err != nil {
		h.writeServiceError(w, err)
		return
	}

	// Intentionally generic response to avoid account enumeration.
	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "If an account with this email exists, a reset code has been sent.",
	})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if err := utils.ValidateStruct(req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.auth.ResetPassword(r.Context(), req.Email, req.Code, req.NewPassword); err != nil {
		h.writeServiceError(w, err)
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Password has been reset successfully.",
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	user, err := h.auth.Me(r.Context(), userID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	utils.WriteJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrUnauthorized):
		utils.WriteError(w, http.StatusUnauthorized, "invalid credentials")
	case errors.Is(err, services.ErrInvalidInput):
		utils.WriteError(w, http.StatusBadRequest, "invalid input")
	case errors.Is(err, services.ErrConflict):
		utils.WriteError(w, http.StatusConflict, "resource already exists")
	case errors.Is(err, services.ErrInvalidInvite):
		utils.WriteError(w, http.StatusBadRequest, "Неверный инвайт-код")
	case errors.Is(err, services.ErrNotFound):
		utils.WriteError(w, http.StatusNotFound, "not found")
	default:
		utils.WriteError(w, http.StatusInternalServerError, "internal server error")
	}
}
