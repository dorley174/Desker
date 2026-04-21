# Desker deployment notes

Этот каталог содержит заготовки для продового и учебного деплоя.

## Локально через Docker Compose

Полный стек приложения:

```bash
docker compose -f docker-compose.full.yml up --build
```

- frontend: `http://localhost:3000`
- backend: `http://localhost:8080`

Метрики:

```bash
cd backend
docker compose -f monitoring/docker-compose.yml up -d
```

## Kubernetes manifests

Файлы в `deploy/k8s` рассчитаны на namespace `team-6-ns`.

Порядок применения:

```bash
kubectl apply -f deploy/k8s/secret.example.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

## Helm

```bash
helm upgrade --install desker-backend ./deploy/helm/desker-backend \
  --namespace team-6-ns \
  --create-namespace \
  --set image.repository=registry.example.com/team-6/desker-backend \
  --set image.tag=latest \
  --set app.jwtSecret=replace-me
```

## GitLab CI idea

Типовой pipeline:

1. собрать docker image backend
2. push в registry
3. выполнить `helm upgrade --install`

Для этого в GitLab обычно хранят:

- `CI_REGISTRY_USER`
- `CI_REGISTRY_PASSWORD`
- `KUBECONFIG` как masked variable или файл
- `HELM_RELEASE`
- `K8S_NAMESPACE`
