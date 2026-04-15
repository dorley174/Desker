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
- `PASSWORD_RESET_CODE_TTL` (`15m`) – duration for password reset codes
- `ALLOWED_ORIGINS` (comma-separated, default `http://localhost:5173`)
- `CORS_ALLOW_CREDENTIALS` (`true`)
- `RATE_LIMIT_PER_MINUTE` (`120`)
- `RATE_LIMIT_BURST` (`60`)
- `READ_TIMEOUT`, `WRITE_TIMEOUT`, `IDLE_TIMEOUT`, `SHUTDOWN_TIMEOUT`
- `MIGRATIONS_DIR` (`./migrations`)
- **SMTP Configuration** (optional; required for email password-reset codes):
  - `SMTP_HOST` – e.g., `smtp.gmail.com`
  - `SMTP_PORT` – e.g., `587` (TLS)
  - `SMTP_USERNAME` – sender email/auth username
  - `SMTP_PASSWORD` – sender password or app password
  - `SMTP_FROM` – sender email address (display name optional)

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

### Option C: Dev Mode Without SMTP

If you don't configure SMTP, password reset codes are printed to server logs:

```
[dev-mailer] password reset code for user@desker.io: 123456
```

## SMTP Setup for Email Delivery

To enable actual email delivery of password reset codes:

### Gmail (Recommended for Testing)

1. Enable 2-Step Verification on your Google Account
2. Generate an **App Password** at https://myaccount.google.com/apppasswords
3. Ensure `Mail` and `Windows Computer` are selected
4. Add to `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

### Other Providers

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-username
SMTP_PASSWORD=your-ses-password
SMTP_FROM=noreply@yourdomain.com
```

Then restart the backend with the updated environment variables.

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
  - **Note:** Requires SMTP configuration to send reset code via email. In dev mode (no SMTP), the code is printed to server logs.

- `POST /api/v1/auth/reset-password`
  - body: `{ "email": "...", "code": "123456", "newPassword": "..." }`
  - response: `{ "message": "Password has been reset successfully." }`

- `GET /api/v1/auth/me` (Bearer token)
  - response: `User`


## User/Profile

- `PUT /api/v1/users/me` (Bearer token)
  - body: `{ "firstName?", "lastName?", "password?", "avatarUrl?" }`
  - `avatarUrl` accepts data URIs (base64 encoded images from file input) or external URLs
  - response: updated `User` object with profile picture

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
