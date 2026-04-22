# Desker deployment notes

Этот каталог подготовлен под реальный деплой backend в ваш Kubernetes-кластер (`team-6-ns`) с SQLite на PVC.

## Почему backend разворачивается в 1 реплику

Проект использует SQLite-файл на `PersistentVolumeClaim`. Для такого сценария безопаснее держать **одну реплику** backend и стратегию обновления **Recreate**, чтобы не получить конкурентную запись в один и тот же файл БД.

## Что уже адаптировано

- backend работает с `DATABASE_DRIVER=sqlite`
- файл БД хранится в `/app/data/desker.db`
- `PVC` монтируется в `/app/data`
- Deployment использует `strategy: Recreate`
- контейнер запускается non-root
- добавлены `startupProbe`, `readinessProbe`, `livenessProbe`
- ingress настроен под префикс `/team-6-api`

## Локальная сборка docker image

```bash
docker build -t desker-backend:local ./backend
```

## Пример ручного создания secret без файла

```bash
kubectl -n team-6-ns create secret generic desker-backend-secret   --from-literal=JWT_SECRET='replace-me'   --from-literal=SMTP_HOST=''   --from-literal=SMTP_PORT='587'   --from-literal=SMTP_USERNAME=''   --from-literal=SMTP_PASSWORD=''   --from-literal=SMTP_FROM='no-reply@desker.local'   --dry-run=client -o yaml | kubectl apply -f -
```

## Деплой manifest-файлами

```bash
export KUBECONFIG=./kubeconfig-team-6.yaml
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
kubectl -n team-6-ns get all
kubectl -n team-6-ns get pvc
kubectl -n team-6-ns get ingress
```

## Важные проверки после деплоя

```bash
kubectl -n team-6-ns rollout status deployment/desker-backend
kubectl -n team-6-ns logs deployment/desker-backend --tail=200
kubectl -n team-6-ns describe pvc desker-sqlite-pvc
```

## Пример внешнего URL для frontend

Ingress переписывает путь `/team-6-api/...` внутрь backend. Поэтому frontend должен использовать API вида:

```bash
VITE_API_URL=https://<INGRESS_HOST_OR_IP>/team-6-api/api/v1
```

## Helm

```bash
helm upgrade --install desker-backend ./deploy/helm/desker-backend   --namespace team-6-ns   --create-namespace   --set image.repository=registry.example.com/team-6/desker-backend   --set image.tag=latest   --set app.allowedOrigins='https://your-frontend-domain.example'   --set app.jwtSecret='replace-me'
```

## GitLab CI idea

Pipeline уже есть в `.gitlab-ci.yml`. Для него обычно нужны переменные:

- `CI_REGISTRY_USER`
- `CI_REGISTRY_PASSWORD`
- `KUBECONFIG_CONTENT`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
