# Desker - UI Spring 26

Полностью доработанная версия проекта бронирования рабочих мест.

## Что реализовано

### Backend

- SQLite по умолчанию вместо PostgreSQL
- миграции с учётом таблицы `schema_migrations`
- регистрация и авторизация через JWT
- хранение пользователей в БД
- понятные ошибки входа и регистрации
- хранение мест и их характеристик в БД
- статусы мест: `free`, `occupied`, `mine`, `unavailable`
- бронирование, отмена, история, отображение активных броней в профиле
- метрики Prometheus для HTTP, auth, seat API и booking API

### Frontend

- работа с реальным API
- безопасная обработка нестабильных ответов API
- runtime-конфиг для `API_BASE_URL`
- поддержка развёртывания в подпути `/team-6/`
- профиль показывает активные бронирования
- добавлен `ErrorBoundary`, чтобы UI не падал в белый экран без сообщения

### DevOps / Deploy

- Dockerfile для frontend и backend
- `docker-compose.full.yml` для локального full-stack запуска
- k8s manifests для backend + frontend + PVC + ingress
- path-based ingress routing по требованиям преподавателя:
  - frontend: `/team-6/`
  - backend: `/team-6-api/`
- Helm chart для backend
- пример `.gitlab-ci.yml`

## Быстрый старт локально

### Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

### Frontend

```bash
npm install
npm run dev
```

По умолчанию frontend ждёт backend на `http://localhost:8080/api/v1`.

### Full stack через Docker

```bash
docker compose -f docker-compose.full.yml up --build
```

## Деплой в Kubernetes по требованиям преподавателя

Сайт публикуется через **path-based ingress routing**, а не через отдельный домен на каждый сервис.

После деплоя маршруты должны быть такими:

- frontend: `http://<INGRESS_HOST_OR_IP>/team-6/`
- backend API: `http://<INGRESS_HOST_OR_IP>/team-6-api/api/v1`

### Сборка образов

```bash
docker build -t dorley174/desker-backend:latest ./backend
docker push dorley174/desker-backend:latest

docker build --build-arg VITE_APP_BASE_PATH=/team-6/ -t dorley174/desker-frontend:latest -f Dockerfile.frontend .
docker push dorley174/desker-frontend:latest
```

### Манифесты

Подробные команды лежат в `deploy/README.md`.

## Что важно про ingress host

`kubeconfig` даёт доступ к Kubernetes API, но **не сообщает пользовательский URL сайта**.
Если `kubectl get ingress` показывает `127.0.0.1`, это не внешний адрес для пользователей.

Нужно запросить у преподавателя или админа кластера **внешний host/IP для `IngressClass=public`**.
Именно его надо использовать как базовый адрес для сайта.

## Демо-данные

- `admin@desker.io` / `admin123`
- `user@desker.io` / `user123`
- `ADMIN2026` — админ
- `JOIN2026` — сотрудник
