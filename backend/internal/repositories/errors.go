package repositories

import "errors"

var (
	ErrNotFound      = errors.New("not found")
	ErrConflict      = errors.New("conflict")
	ErrInvalidInvite = errors.New("invalid invite code")
	ErrAlreadyExists = errors.New("already exists")
)
