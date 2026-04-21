# Отчёт по доработке проекта Desker

## 1. Backend и БД

Сделано:

- backend переведён на `SQLite` по умолчанию
- добавлен переключатель `DATABASE_DRIVER=sqlite|postgres`
- переписаны миграции под SQLite
- добавлена таблица `schema_migrations`
- сидирование мест и тестовых пользователей перенесено в Go-код
- исправлен дефект старого seed-кода: использовался несуществующий столбец `avatar_url`
- статусы мест теперь формируются сервером: `free`, `occupied`, `mine`, `unavailable`
- история бронирований и активные брони отдаются из реальной БД
- в профиле фронтенда показываются активные бронирования
- исправлена отмена брони (был перепутан порядок аргументов при вызове repository)

## 2. Авторизация и регистрация

Сделано:

- регистрация сохраняет пользователя в БД
- логин идёт через проверку хеша пароля и JWT
- при попытке зарегистрировать существующий email возвращается понятная ошибка
- при неверном пароле возвращается понятная ошибка
- сценарий восстановления пароля не падает без SMTP: в dev-режиме код печатается в лог

## 3. Бронирования

Сделано:

- создание брони на набор часов
- защита от пересечения бронирований
- отмена брони
- история бронирований пользователя
- активные брони пользователя в профиле

Отложено как отдельное улучшение:

- серверный API для правила «повторять бронь каждую неделю по шаблону». Сейчас фронтенд может повторять сценарий, создавая последовательность отдельных броней по датам.

## 4. Метрики и мониторинг

Сделано:

- сохранены HTTP-метрики
- добавлены доменные метрики:
  - `desker_bookings_total`
  - `desker_auth_operations_total`
  - `desker_seat_queries_total`
- сохранён запуск `Prometheus + Grafana` из репозитория

## 5. Docker / Deploy

Сделано:

- `docker-compose.full.yml` для полного локального стека
- `Dockerfile.frontend` + `nginx` + runtime `env-config.js`
- Kubernetes manifests:
  - ConfigMap
  - Secret example
  - PVC
  - Deployment
  - Service
  - Ingress
- Helm chart для backend
- пример `.gitlab-ci.yml`

## 6. Кластерные файлы, которые были присланы

### `dev-ops-templates-main.zip`

Это учебный/reference-набор примеров по:

- Docker
- Kubernetes
- Helm
- GitLab Runner / GitLab CI

Он нужен не как runtime-зависимость приложения, а как шаблон и ориентир для оформления инфраструктуры.

### `kubeconfig-team-6.yaml`

Это конфигурация для `kubectl`/`helm`, через которую клиент получает доступ к вашему учебному кластеру.

Из kubeconfig видно:

- context: `team-6-context`
- cluster: `microk8s-cluster`
- user: `team-6-user`

Этот файл нельзя публиковать в открытый репозиторий.

## 7. Команды

### Локальный backend

```bash
cd backend
cp .env.example .env
mkdir -p data
go mod tidy
go run ./cmd/server
```

### Локальный frontend

```bash
npm install
npm run dev
```

### Full stack

```bash
docker compose -f docker-compose.full.yml up --build
```

### Метрики

```bash
cd backend
docker compose -f monitoring/docker-compose.yml up -d
```

### Работа с кластером

```bash
export KUBECONFIG=./kubeconfig-team-6.yaml
kubectl config current-context
kubectl get ns
kubectl get pods -A
```

### Деплой манифестами

```bash
kubectl create namespace team-6-ns --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f deploy/k8s/secret.example.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
kubectl -n team-6-ns get all
```

### Деплой Helm

```bash
helm upgrade --install desker-backend ./deploy/helm/desker-backend \
  --namespace team-6-ns \
  --create-namespace \
  --set image.repository=registry.example.com/team-6/desker-backend \
  --set image.tag=latest \
  --set app.jwtSecret=replace-me
```

## 8. Ограничение среды

В текущей среде не было доступа к интернету для скачивания новых Go/npm зависимостей, поэтому код, конфиги и артефакты деплоя подготовлены полностью, но после распаковки архива на своей машине нужно выполнить:

```bash
cd backend
go mod tidy
```

и обычную установку frontend-зависимостей (`npm install`).
