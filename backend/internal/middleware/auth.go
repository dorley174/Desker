package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/nov-o/desker/backend/internal/utils"
)

type contextKey string

const (
	ctxUserIDKey contextKey = "userID"
	ctxRoleKey   contextKey = "role"
)

// Auth verifies a Bearer token and stores auth claims in context.
func Auth(jwt *utils.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			parts := strings.SplitN(h, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				utils.WriteError(w, http.StatusUnauthorized, "missing or invalid authorization header")
				return
			}

			claims, err := jwt.ParseToken(parts[1])
			if err != nil {
				utils.WriteError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			ctx := context.WithValue(r.Context(), ctxUserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, ctxRoleKey, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxUserIDKey).(string)
	return v
}

func RoleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxRoleKey).(string)
	return v
}
