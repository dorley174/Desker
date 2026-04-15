# Desker Backend (Go)

Production-ready backend for the existing Desker frontend. It mirrors frontend contracts used in:

- auth (`User`, role-based flow, invite codes)
- booking (`Seat`, `HourSlot`, `Booking`)
- profile/settings/history

## Stack

- Go 1.23
- Router: `chi`
- DB access: `sqlx`
- Database: PostgreSQL
- Auth: JWT (HS256)
- Validation: `go-playground/validator`

## Project Structure

```
backend/
  cmd/server/main.go
  internal/
    config/
    database/
    handlers/
    middleware/
    models/
    repositories/
    routes/
    services/
    utils/
  migrations/
  Dockerfile
  docker-compose.yml
  .env.example
```

## Environment Variables

Copy `.env.example` and update values:

- `APP_ENV` (`development` by default)
- `PORT` (`8080`)
- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `JWT_TTL` (`24h`)
- `ALLOWED_ORIGINS` (comma-separated, default `http://localhost:5173`)
- `CORS_ALLOW_CREDENTIALS` (`true`)
- `RATE_LIMIT_PER_MINUTE` (`120`)
- `RATE_LIMIT_BURST` (`60`)
- `READ_TIMEOUT`, `WRITE_TIMEOUT`, `IDLE_TIMEOUT`, `SHUTDOWN_TIMEOUT`
- `MIGRATIONS_DIR` (`./migrations`)

## Local Run

### Option A: Run with local Postgres

1. Start PostgreSQL and create database `desker`
2. From `backend`:

```bash
go mod tidy
go run ./cmd/server
```

### Option B: Docker Compose

```bash
docker compose up --build
```

Services:

- API: `http://localhost:8080`
- Postgres: `localhost:5432`

## API Base

`/api/v1`

## Health

- `GET /healthz`

## Auth Endpoints

- `POST /api/v1/auth/login`
  - body: `{ "email": "...", "password": "..." }`
  - response: `{ "token": "...", "user": User }`

- `POST /api/v1/auth/register`
  - body: `{ "email", "firstName", "lastName", "password", "inviteCode?" }`
  - response: `{ "token": "...", "user": User }`

- `POST /api/v1/auth/forgot-password`
  - body: `{ "email": "..." }`
  - response: generic success message

- `GET /api/v1/auth/me` (Bearer token)
  - response: `User`

## User/Profile

- `PUT /api/v1/users/me` (Bearer token)
  - body: `{ "firstName?", "lastName?", "password?" }`
  - response: updated `User`

## Seats/Booking Data Contracts

These contracts are backend-compatible with current frontend interfaces:

### `Seat`

```json
{
  "id": "string",
  "number": 1,
  "zone": "A",
  "floor": 1,
  "tags": ["Принтер"],
  "status": "free"
}
```

### `HourSlot`

```json
{ "hour": 9, "status": "mine" }
```

### `Booking`

```json
{
  "id": "...",
  "seatId": "...",
  "floor": 1,
  "seatNumber": 3,
  "zone": "A",
  "date": "2026-04-15",
  "startHour": 9,
  "endHour": 12,
  "status": "active"
}
```

## Seat Endpoints

- `GET /api/v1/floors`
- `GET /api/v1/equipment-tags`
- `GET /api/v1/seats?floor=1&date=2026-04-15&tags=Принтер,Доска&status=all`
- `GET /api/v1/seats/{seatID}/slots?date=2026-04-15`

`status` filter supports: `all | free | occupied`

## Booking Endpoints

- `POST /api/v1/bookings`
  - body supports either:
    - `{ "seatId", "date", "startHour", "endHour" }`
    - `{ "seatId", "date", "hours": [9,10,11] }`
  - response: `{ "items": Booking[] }`

- `DELETE /api/v1/bookings/{bookingID}`

- `GET /api/v1/bookings/history?page=1&pageSize=20&status=active&sortBy=booking_date&sortOrder=DESC`
  - response: `{ "items": Booking[], "total": 0, "page": 1, "pageSize": 20 }`

## Security & Ops Features

- JWT authentication middleware
- CORS allowlist
- Basic security headers
- Per-IP rate limiting
- Panic recovery middleware
- Request logging (`slog`)
- Graceful shutdown with timeout
- Startup migrations

## Database Migration

Migrations run automatically on startup from `MIGRATIONS_DIR`.

Initial migration seeds:

- invite codes: `ADMIN2026`, `JOIN2026`
- deterministic floors/zones/seats

## Tests

Run:

```bash
go test ./...
```

Included critical-path unit tests:

- handler validation path (`internal/handlers/auth_handler_test.go`)
- auth service logic (`internal/services/auth_service_test.go`)
- repository behavior with SQL mock (`internal/repositories/user_repository_test.go`)
