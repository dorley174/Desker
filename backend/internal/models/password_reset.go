package models

import "time"

// PasswordResetCode stores a one-time verification code for password recovery.
type PasswordResetCode struct {
	ID        string     `db:"id"`
	UserID    string     `db:"user_id"`
	Email     string     `db:"email"`
	CodeHash  string     `db:"code_hash"`
	ExpiresAt time.Time  `db:"expires_at"`
	UsedAt    *time.Time `db:"used_at"`
	CreatedAt time.Time  `db:"created_at"`
}
