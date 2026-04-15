package utils

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse is a standard API error payload.
type ErrorResponse struct {
	Error string `json:"error"`
}

// WriteJSON writes any payload as JSON with status code.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteError writes a standard JSON error response.
func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, ErrorResponse{Error: message})
}
