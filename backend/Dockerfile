FROM golang:1.23.4-alpine3.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /desker-api ./cmd/server

FROM alpine:3.21
RUN adduser -D -g '' appuser
WORKDIR /app
COPY --from=builder /desker-api /usr/local/bin/desker-api
COPY migrations ./migrations
USER appuser
EXPOSE 8080
CMD ["desker-api"]
