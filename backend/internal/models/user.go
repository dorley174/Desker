package models

import "time"

type UserRole string

const (
	RoleAdmin    UserRole = "admin"
	RoleEmployee UserRole = "employee"
)

// User is the application user model.
type User struct {
	ID           string    `db:"id" json:"id"`
	Email        string    `db:"email" json:"email"`
	FirstName    string    `db:"first_name" json:"firstName"`
	LastName     string    `db:"last_name" json:"lastName"`
	Role         UserRole  `db:"role" json:"role"`
	PasswordHash string    `db:"password_hash" json:"-"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt    time.Time `db:"updated_at" json:"updatedAt"`
}
