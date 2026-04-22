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
- runtime-конфиг для `API_BASE_URL`
- профиль показывает активные бронирования
- текстовые блоки приведены в соответствие с серверным режимом, а не mock/localStorage

### DevOps / Deploy

- Dockerfile для frontend
- `docker-compose.full.yml` для локального full-stack запуска
- k8s manifests для backend + PVC + ingress
- Helm chart
- пример `.gitlab-ci.yml`
- инструкции по Prometheus + Grafana

## Быстрый старт

### 1. Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

### 2. Frontend

```bash
npm install
npm run dev
```

По умолчанию frontend ждёт backend на `http://localhost:8080/api/v1`.

### 3. Full stack через Docker

```bash
docker compose -f docker-compose.full.yml up --build
```

## Мониторинг

```bash
cd backend
docker compose -f monitoring/docker-compose.yml up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Демо-данные

- `admin@desker.io` / `admin123`
- `user@desker.io` / `user123`
- `ADMIN2026` — админ
- `JOIN2026` — сотрудник

## Примечание

В этой среде у меня не было доступа к загрузке новых Go/npm зависимостей из сети, поэтому я подготовил код, конфигурацию и деплой-артефакты, но не смог выполнить полноценную сборку с обновлением lock-файлов через интернет. На твоей машине после распаковки архива сделай `go mod tidy` и обычную установку frontend-зависимостей.


## Kubernetes cluster deploy

Backend адаптирован под развёртывание в Kubernetes-кластер с PVC для SQLite.

Ключевые свойства:

- одна реплика backend
- стратегия обновления `Recreate`
- PVC `desker-sqlite-pvc`
- ingress path `/team-6-api(/|$)(.*)` с rewrite на backend
- frontend должен использовать `VITE_API_URL=https://<INGRESS_HOST_OR_IP>/team-6-api/api/v1`

Подробные команды лежат в `deploy/README.md`.
