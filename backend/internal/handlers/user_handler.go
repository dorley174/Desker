package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/nov-o/desker/backend/internal/middleware"
	"github.com/nov-o/desker/backend/internal/services"
	"github.com/nov-o/desker/backend/internal/utils"
)

type UserHandler struct {
	users *services.UserService
}

type updateProfileRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Password  string `json:"password"`
}

func NewUserHandler(users *services.UserService) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	user, err := h.users.UpdateProfile(r.Context(), userID, req.FirstName, req.LastName, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidInput):
			utils.WriteError(w, http.StatusBadRequest, "nothing to update")
		case errors.Is(err, services.ErrNotFound):
			utils.WriteError(w, http.StatusNotFound, "user not found")
		default:
			utils.WriteError(w, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	utils.WriteJSON(w, http.StatusOK, user)
}
