# Desker backend

## Local run

```bash
cp .env.example .env
go mod tidy
go run ./cmd/server
```

По умолчанию backend работает с SQLite:

- `DATABASE_DRIVER=sqlite`
- `DATABASE_URL=./data/desker.db`

## Docker image

```bash
docker build -t desker-backend:local .
```

Контейнер собран под деплой в Kubernetes:

- запускается от non-root пользователя `10001:10001`
- ожидает SQLite-файл по пути `/app/data/desker.db`
- миграции лежат в `/app/migrations`

## Kubernetes

Для кластера смотри инструкции в `../deploy/README.md`.
