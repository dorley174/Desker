# Desker deployment notes

Этот каталог подготовлен под требования преподавателя: **path-based routing через IngressClass `public`**.

## Что получается после деплоя

- frontend: `/team-6/`
- backend API: `/team-6-api/`
- frontend использует API по относительному пути `/team-6-api/api/v1`

Это снимает необходимость публиковать backend на отдельном домене.

## Важно про внешний адрес ingress

Сам `kubectl get ingress` внутри этого кластера может показывать `127.0.0.1`. Это **не пользовательский URL**.
Для реального доступа нужен **общий внешний host/IP ingress-controller**, который должен дать преподаватель или администратор кластера.

Итоговый URL сайта будет таким:

```text
http://<INGRESS_HOST_OR_IP>/team-6/
```

А API фронт будет вызывать так:

```text
http://<INGRESS_HOST_OR_IP>/team-6-api/api/v1
```

Если хотите использовать собственный домен, его надо направить на внешний IP ingress-controller. Этот IP тоже должен быть известен со стороны инфраструктуры.

## Почему backend в 1 реплике

Проект использует SQLite-файл на `PersistentVolume`. Для такого сценария безопаснее держать **одну реплику** backend и стратегию обновления **Recreate**.

## Образы

Рекомендуемые имена образов:

- `dorley174/desker-backend:latest`
- `dorley174/desker-frontend:latest`

## Сборка и push backend

```bash
docker build -t dorley174/desker-backend:latest ./backend
docker push dorley174/desker-backend:latest
```

## Сборка и push frontend

Frontend должен собираться с базовым путём `/team-6/`.

```bash
docker build --build-arg VITE_APP_BASE_PATH=/team-6/ -t dorley174/desker-frontend:latest -f Dockerfile.frontend .
docker push dorley174/desker-frontend:latest
```

## Secret backend

```bash
kubectl -n team-6-ns create secret generic desker-backend-secret   --from-literal=JWT_SECRET='replace-me'   --from-literal=SMTP_HOST=''   --from-literal=SMTP_PORT='587'   --from-literal=SMTP_USERNAME=''   --from-literal=SMTP_PASSWORD=''   --from-literal=SMTP_FROM='no-reply@desker.local'   --dry-run=client -o yaml | kubectl apply -f -
```

## Деплой manifest-файлами

```bash
export KUBECONFIG=./kubeconfig-team-6.yaml
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
```

## Проверки после деплоя

```bash
kubectl -n team-6-ns rollout status deployment/desker-backend
kubectl -n team-6-ns rollout status deployment/desker-frontend
kubectl -n team-6-ns get pods,svc,ingress
kubectl -n team-6-ns logs deployment/desker-backend --tail=200
```

## Что спрашивать у преподавателя

Если сайт снаружи не открывается, нужно спросить **не kubeconfig и не IP API-сервера Kubernetes**, а именно:

- какой внешний host/IP соответствует `IngressClass=public`
- по какому адресу доступен ingress с path-based routing

Формулировка:

> Подскажите, пожалуйста, внешний host/IP для IngressClass `public`, чтобы открыть маршруты `/team-6/` и `/team-6-api/` снаружи.

## Fallback: NodePort

Если преподаватель временно разрешит, можно использовать `NodePort`, но это нецелевой путь по сравнению с ingress.
