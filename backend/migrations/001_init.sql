CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
    code TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    floor INTEGER NOT NULL CHECK (floor BETWEEN 1 AND 6),
    seat_number INTEGER NOT NULL,
    zone TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (floor, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    booking_date TEXT NOT NULL,
    start_hour INTEGER NOT NULL CHECK (start_hour >= 8 AND start_hour <= 19),
    end_hour INTEGER NOT NULL CHECK (end_hour >= 9 AND end_hour <= 20),
    status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'no-show', 'active')),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CHECK (start_hour < end_hour)
);

CREATE INDEX IF NOT EXISTS idx_bookings_seat_date ON bookings (seat_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings (user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_seats_floor ON seats (floor);
