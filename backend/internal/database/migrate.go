package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
)

// RunMigrations executes SQL files from a directory in lexical order once.
func RunMigrations(ctx context.Context, db *sqlx.DB, migrationsDir string) error {
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL
		)
	`); err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	files := make([]string, 0)
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".sql") {
			files = append(files, filepath.Join(migrationsDir, name))
		}
	}
	sort.Strings(files)

	for _, file := range files {
		base := filepath.Base(file)
		var alreadyApplied bool
		if err := db.GetContext(ctx, &alreadyApplied, db.Rebind(`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = ?)`), base); err != nil {
			return fmt.Errorf("check migration %s: %w", base, err)
		}
		if alreadyApplied {
			continue
		}

		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}

		tx, err := db.BeginTxx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin migration tx %s: %w", base, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("execute migration %s: %w", file, err)
		}
		if _, err := tx.ExecContext(ctx, db.Rebind(`INSERT INTO schema_migrations (filename, applied_at) VALUES (?, CURRENT_TIMESTAMP)`), base); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", base, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", base, err)
		}
	}

	return nil
}
