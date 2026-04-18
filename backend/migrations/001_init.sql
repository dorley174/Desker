CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
    code TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY,
    floor INT NOT NULL CHECK (floor BETWEEN 1 AND 6),
    seat_number INT NOT NULL,
    zone TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (floor, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_hour INT NOT NULL CHECK (start_hour >= 8 AND start_hour <= 19),
    end_hour INT NOT NULL CHECK (end_hour >= 9 AND end_hour <= 20),
    status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'no-show', 'active')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CHECK (start_hour < end_hour)
);

CREATE INDEX IF NOT EXISTS idx_bookings_seat_date ON bookings (seat_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings (user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_seats_floor ON seats (floor);
CREATE INDEX IF NOT EXISTS idx_seats_tags ON seats USING GIN (tags);

INSERT INTO invite_codes (code, role, is_active)
VALUES
  ('ADMIN2026', 'admin', TRUE),
  ('JOIN2026', 'employee', TRUE)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
    floor_num INT;
    zone_name TEXT;
    seat_num INT;
    tag_pool TEXT[] := ARRAY['Принтер','Доска','2+ мониторов','ТВ-панель','Кондиционер','Тихая зона'];
    pick_count INT;
    picked_tags TEXT[];
BEGIN
    FOR floor_num IN 1..6 LOOP
        seat_num := 1;
        FOREACH zone_name IN ARRAY ARRAY['A','B','C','D'] LOOP
            FOR i IN 1..8 LOOP
                pick_count := (RANDOM() * 3)::INT;
                IF pick_count = 0 THEN
                    picked_tags := ARRAY[]::TEXT[];
                ELSE
                    SELECT ARRAY(
                        SELECT unnest(tag_pool)
                        ORDER BY random()
                        LIMIT pick_count
                    ) INTO picked_tags;
                END IF;

                INSERT INTO seats (id, floor, seat_number, zone, tags, is_available)
                VALUES (gen_random_uuid(), floor_num, seat_num, zone_name, COALESCE(picked_tags, ARRAY[]::TEXT[]), TRUE)
                ON CONFLICT (floor, seat_number) DO NOTHING;

                seat_num := seat_num + 1;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
