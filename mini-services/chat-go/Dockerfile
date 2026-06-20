# syntax=docker/dockerfile:1

# Build stage ? cross-compile for linux/amd64 from Apple Silicon via buildx.
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

ARG TARGETOS=linux
ARG TARGETARCH=amd64

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH}

RUN go build -trimpath -ldflags="-s -w" -o /out/chat ./cmd/chat

# Runtime ? minimal attack surface.
FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget \
  && adduser -D -H -u 10001 app

USER app

COPY --from=builder /out/chat /usr/local/bin/chat

EXPOSE 3004

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3004/health | grep -q '"ok":true' || exit 1

ENTRYPOINT ["/usr/local/bin/chat"]
