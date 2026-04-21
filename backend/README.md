# Desker Backend (Go)

Обновлённый backend для Desker с реальной SQLite-базой, регистрацией, авторизацией, бронированием мест, историей бронирований и метриками Prometheus.

## Что изменено

- PostgreSQL заменён на SQLite по умолчанию
- добавлен выбор драйвера через `DATABASE_DRIVER=sqlite|postgres`
- миграции стали идемпотентными: теперь есть таблица `schema_migrations`
- починено сидирование: места, инвайт-коды и тестовые пользователи заполняются из Go-кода
- исправлен критичный дефект старого seed-кода (`avatar_url` вставлялся в несуществующий столбец)
- ошибки логина и регистрации сделаны более понятными для UI
- история бронирований автоматически показывает прошедшие `active` брони как `completed`
- добавлены доменные метрики для auth и seat API

## Stack

- Go 1.23
- Router: `chi`
- DB access: `sqlx`
- Database: SQLite by default (`modernc.org/sqlite`), PostgreSQL optional
- Auth: JWT (HS256)
- Validation: `go-playground/validator`
- Metrics: Prometheus

## Environment variables

Основные:

- `APP_ENV` (`development` по умолчанию)
- `PORT` (`8080`)
- `DATABASE_DRIVER` (`sqlite` по умолчанию)
- `DATABASE_URL`
  - для SQLite: `./data/desker.db`
  - для PostgreSQL: `postgres://user:pass@host:5432/dbname?sslmode=disable`
- `JWT_SECRET` (обязательно)
- `JWT_TTL` (`24h`)
- `PASSWORD_RESET_CODE_TTL` (`15m`)
- `ALLOWED_ORIGINS` (например `http://localhost:5173,http://localhost:3000`)
- `CORS_ALLOW_CREDENTIALS` (`true`)
- `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_BURST`
- `READ_TIMEOUT`, `WRITE_TIMEOUT`, `IDLE_TIMEOUT`, `SHUTDOWN_TIMEOUT`
- `MIGRATIONS_DIR` (`./migrations`)

SMTP (опционально):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Если SMTP не настроен, код восстановления пароля печатается в логах сервера.

## Local run

### Option A: локально с SQLite

```bash
cd backend
cp .env.example .env
mkdir -p data
go mod tidy
go run ./cmd/server
```

API будет доступен на `http://localhost:8080`.

### Option B: Docker

```bash
cd backend
docker compose up --build
```

SQLite-файл будет храниться в docker volume `desker_sqlite_data`.

## API base

`/api/v1`

## Health and metrics

- `GET /healthz`
- `GET /metrics`

## Auth endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`

## Profile

- `PUT /api/v1/users/me`

## Seat endpoints

- `GET /api/v1/floors`
- `GET /api/v1/equipment-tags`
- `GET /api/v1/seats?floor=1&date=2026-04-15&tags=Принтер,2+ мониторов&status=all`
- `GET /api/v1/seats/{seatID}/slots?date=2026-04-15`

Статусы мест:

- `free`
- `occupied`
- `mine`
- `unavailable`

## Booking endpoints

- `POST /api/v1/bookings`
- `DELETE /api/v1/bookings/{bookingID}`
- `GET /api/v1/bookings/history?page=1&pageSize=20&status=active&sortBy=booking_date&sortOrder=DESC`

Повторные еженедельные брони уже поддерживаются на фронтенде: UI вызывает этот endpoint несколько раз для последовательности дат.

## Metrics

Помимо общих HTTP-метрик экспортируются:

- `desker_bookings_total{operation,result}`
- `desker_auth_operations_total{operation,result}`
- `desker_seat_queries_total{operation,result}`
- `desker_db_*`

## Monitoring

```bash
cd backend
docker compose -f monitoring/docker-compose.yml up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- логин Grafana: `admin` / `admin`

По умолчанию Prometheus скрапит `http://host.docker.internal:8080/metrics`, то есть backend должен быть запущен на хосте или отдельно опубликован на `8080`.

## Tests

После загрузки зависимостей:

```bash
go test ./...
```

## Important note about dependencies

В текущей среде я не мог скачать новые Go-зависимости из сети, поэтому после распаковки архива первым делом нужно выполнить `go mod tidy`, чтобы подтянуть SQLite driver и обновить `go.sum`.
