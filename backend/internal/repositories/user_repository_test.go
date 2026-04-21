package repositories

import (
	"context"
	"database/sql"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
)

func TestUserRepositoryGetByEmailNotFound(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer sqlDB.Close()

	db := sqlx.NewDb(sqlDB, "sqlmock")
	repo := NewUserRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, email, first_name, last_name, role, password_hash, created_at, updated_at
		FROM users
		WHERE email = ?
	`)).WithArgs("missing@desker.io").WillReturnError(sql.ErrNoRows)

	_, err = repo.GetByEmail(context.Background(), "missing@desker.io")
	if err == nil {
		t.Fatal("expected error")
	}
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("expectations not met: %v", err)
	}
}
