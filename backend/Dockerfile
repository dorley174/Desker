FROM golang:1.25.1-alpine3.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/desker-api ./cmd/server

FROM alpine:3.22
RUN addgroup -S -g 10001 app     && adduser -S -D -H -u 10001 -G app appuser     && mkdir -p /app/data /app/migrations     && chown -R 10001:10001 /app
WORKDIR /app
COPY --from=builder /out/desker-api /usr/local/bin/desker-api
COPY --chown=10001:10001 migrations ./migrations
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["desker-api"]
