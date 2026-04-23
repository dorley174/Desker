# Desker — Employee Workspace Booking Platform

**UI Spring 2026 · Full-stack project · Backend + Frontend + DevOps + Deploy**

Desker — это веб-приложение для бронирования рабочих мест и комнат сотрудниками компании.  
Система позволяет искать доступные места, бронировать их на нужное время, просматривать историю броней, а администратору — управлять доступностью мест и контролировать состояние офисного пространства.

---

## Кратко о проекте

Проект реализован как **полноценное full-stack решение**:

- **Backend** с API, авторизацией, бизнес-логикой и метриками
- **Frontend** с интерфейсом бронирования, профилем и админскими функциями
- **DevOps / Deploy** через Docker и Kubernetes
- **Observability** через Prometheus + Grafana

Система развёрнута по path-based ingress routing и доступна по внешнему адресу:

- **Приложение:** http://213.165.209.28/team-6/
- **Healthcheck:** http://213.165.209.28/team-6-api/healthz
- **Grafana:** http://213.165.209.28/team-6-grafana/

---

## Что реализовано

## Backend

- SQLite по умолчанию вместо PostgreSQL
- автоматические миграции БД
- хранение пользователей, мест и броней в БД
- регистрация и авторизация через JWT
- понятные ошибки регистрации и входа
- история броней пользователя
- отображение активных броней в профиле
- статусы мест:
  - `free`
  - `occupied`
  - `mine`
  - `unavailable`
- запрет бронирования недоступных мест
- админский API для блокировки / разблокировки мест
- Prometheus-метрики для:
  - HTTP-запросов
  - latency
  - auth API
  - booking API
  - seat API

## Frontend

- работа с реальным API
- безопасная обработка нестабильных ответов backend
- поддержка развёртывания в подпути `/team-6/`
- карта мест и визуализация зон
- профиль пользователя с активными бронями и историей
- административная панель
- возможность блокировать и разблокировать места
- отдельная страница **Контакты**
- обработка ошибок через `ErrorBoundary`
- обновлённый интерфейс без лишних элементов:
  - удалён автоподбор
  - удалена рекомендация места
  - убрана секция `No-show` у пользователя
  - карточки мест центрированы по горизонтали

## DevOps / Deploy

- Dockerfile для backend
- Dockerfile для frontend
- локальный full-stack запуск через Docker Compose
- Kubernetes manifests для:
  - backend
  - frontend
  - PVC
  - ConfigMap
  - Secret
  - Ingress
  - Prometheus
  - Grafana
- path-based ingress routing по требованиям преподавателя:
  - frontend: `/team-6/`
  - backend: `/team-6-api/`
  - grafana: `/team-6-grafana/`

---

## Технологический стек

### Backend
- Go
- Chi Router
- SQLX
- SQLite
- JWT
- Prometheus client

### Frontend
- React
- TypeScript
- Vite
- React Router
- Tailwind / UI components

### DevOps / Infra
- Docker
- Docker Hub
- Kubernetes
- Ingress
- Prometheus
- Grafana

---

## Архитектура

```text
Frontend (/team-6/)
        ↓
Ingress (path-based routing)
        ↓
Backend API (/team-6-api/)
        ↓
SQLite on PVC
```

Отдельно:
- Prometheus собирает метрики с backend `/metrics`
- Grafana отображает дашборды по данным Prometheus

---

## Локальный запуск

## Backend

```bash
cd backend
cp .env.example .env
mkdir -p data
go mod tidy
go run ./cmd/server
```

## Frontend

```bash
npm install
npm run dev
```

## Full-stack через Docker Compose

```bash
docker compose -f docker-compose.full.yml up --build
```

---

## Деплой в Kubernetes

## Подключение к кластеру

```bash
export KUBECONFIG=./kubeconfig-team-6.yaml
kubectl config current-context
kubectl get ns
kubectl get pods -A
```

## Backend + Frontend

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/pv.yaml
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/frontend-configmap.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/frontend-deployment.yaml
kubectl apply -f deploy/k8s/frontend-service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
kubectl -n team-6-ns get pods,svc,ingress
```

## Обновление backend image

```bash
docker build -t dorley174/desker-backend:vX ./backend
docker push dorley174/desker-backend:vX

kubectl -n team-6-ns set image deployment/desker-backend desker-backend=dorley174/desker-backend:vX --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
kubectl -n team-6-ns rollout status deployment/desker-backend --timeout=180s --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
```

## Обновление frontend image

```bash
docker build --build-arg VITE_APP_BASE_PATH=/team-6/ -t dorley174/desker-frontend:vX -f Dockerfile.frontend .
docker push dorley174/desker-frontend:vX

kubectl -n team-6-ns set image deployment/desker-frontend desker-frontend=dorley174/desker-frontend:vX --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
kubectl -n team-6-ns rollout status deployment/desker-frontend --timeout=180s --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
```

---

## Monitoring

## Grafana

Адрес:
- http://213.165.209.28/team-6-grafana/

Логин по умолчанию:
- `admin`
- `admin`

## Prometheus

Применить манифесты:

```bash
kubectl apply -f .\deploy\k8s\prometheus-configmap.yaml --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
kubectl apply -f .\deploy\k8s\prometheus-deployment.yaml --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
kubectl apply -f .\deploy\k8s\prometheus-service.yaml --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
kubectl -n team-6-ns rollout status deployment/desker-prometheus --timeout=180s --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
```

Открыть локально через port-forward:

```bash
kubectl -n team-6-ns port-forward svc/desker-prometheus 9090:9090 --kubeconfig "C:\mts\Desker\kubeconfig-team-6.yaml"
```

Потом в браузере:
- http://localhost:9090
- http://localhost:9090/targets

Для корректной работы метрик target `desker-backend` должен быть в состоянии **UP**.

---

## Демо-данные

- `admin@desker.io` / `admin123`
- `user@desker.io` / `user123`

Инвайт-коды:
- `ADMIN2026` — администратор
- `JOIN2026` — сотрудник

---

## Основные сценарии использования

### Для сотрудника
- зарегистрироваться / войти
- выбрать место
- забронировать место на нужный слот
- посмотреть свои активные брони
- посмотреть историю

### Для администратора
- просматривать общую структуру мест
- управлять доступностью мест
- блокировать и разблокировать места
- контролировать состояние системы через Grafana

---

## Результат

На текущем этапе проект представляет собой завершённое full-stack решение для бронирования рабочих мест с:

- работающим frontend
- работающим backend
- развёртыванием в Kubernetes
- path-based ingress
- наблюдаемостью через Prometheus и Grafana
- готовностью к демонстрации и защите

---

## Примечания

- HTTPS для внешнего IP не настраивался, доступ выполняется по HTTP
- секреты (`JWT_SECRET`, SMTP и kubeconfig) не должны храниться в git
- SQLite выбрана как лёгкая БД для учебного проекта и малого объёма данных

---

## Контакты команды

Ниже можно заполнить состав команды в нужном формате:

- Имя Фамилия — Роль в проекте — Контакт через @
- Имя Фамилия — Роль в проекте — Контакт через @
- Имя Фамилия — Роль в проекте — Контакт через @
