CREATE TABLE IF NOT EXISTS password_reset_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email_created_at
    ON password_reset_codes (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id
    ON password_reset_codes (user_id);
