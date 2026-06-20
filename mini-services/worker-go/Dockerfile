# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

ARG TARGETOS=linux
ARG TARGETARCH=amd64

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH}

RUN go build -trimpath -ldflags="-s -w" -o /out/worker ./cmd/worker

FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget \
  && adduser -D -H -u 10001 app

USER app

COPY --from=builder /out/worker /usr/local/bin/worker

EXPOSE 8081

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD wget -qO- http://127.0.0.1:8081/health | grep -q '"ok":true' || exit 1

ENTRYPOINT ["/usr/local/bin/worker"]
