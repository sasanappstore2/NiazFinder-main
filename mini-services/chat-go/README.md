# NiazFinder Chat (Go)

High-concurrency WebSocket chat service replacing the Bun/Node Socket.io server.

## Stack

- Go 1.22+
- `gorilla/websocket` hub pattern
- `pgx/v5` for auth + message persistence
- `redis/go-redis/v9` pub/sub fan-out + distributed rate limiting

## Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Liveness + DB/Redis checks |
| `GET /metrics` | Online users / active sockets |
| `GET /presence?userIds=a,b` | Local-instance presence |
| `POST /internal/fanout` | BFF ? chat broadcast (`x-internal-secret`) |
| `GET /ws?token=<bearer>` | WebSocket upgrade |

## WebSocket protocol (JSON)

**Client ? server**

```json
{"event":"join:conversation","data":"conv_123"}
{"event":"message:send","data":{"conversationId":"conv_123","content":"????","clientTempId":"tmp-1"}}
```

**Server ? client**

```json
{"event":"message:new","data":{"conversationId":"conv_123","messageId":"tmp-1","senderId":"user_1","content":"????","clientTempId":"tmp-1","type":"TEXT","createdAt":"..."}}
```

## Rooms

- `user:{userId}` ? notifications / direct user channel
- `conv:{conversationId}` ? conversation messages

## Horizontal scaling

Each instance subscribes to Redis channel `comm:events` (configurable). Outbound messages are published with an `origin` instance ID to avoid echo.

## Local dev

```bash
cd mini-services/chat-go
go mod tidy
DATABASE_URL=... REDIS_URL=redis://localhost:6379 go run ./cmd/chat
```

## Docker (M1 ? amd64)

```bash
docker buildx build --platform linux/amd64 -t niazfinder/chat-go -f Dockerfile .
```

## Frontend migration note

The current Next.js client uses Socket.io. To adopt this service, point the client to native WebSocket (`/ws?token=`) or add a thin Socket.io compatibility shim. Health and internal fanout APIs are drop-in compatible with the Node chat-service.
