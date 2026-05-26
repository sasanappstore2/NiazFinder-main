# Realtime Typing Analysis

Rules-only lightweight layer for `/post` need intake. No LLM on keystroke.

## Architecture

```
User keystrokes → debounce 400ms → WS /intake-typing (Nest) → POST Next /api/need-intake/typing-analyze
                                 ↘ REST fallback (same route)
```

| Layer | SLA | Tech |
|-------|-----|------|
| Lightweight realtime | p95 &lt; 300ms | `vertical-classifier` + `intent-parser`, in-memory + Redis cache |
| Heavy async | post-submit | BullMQ `intake-heavy` on Nest |

## Events (Socket.io namespace `/intake-typing`)

| Client → Server | Payload |
|-----------------|---------|
| `typing.join` | `{ sessionId, userId? }` |
| `typing.analyze` | `{ sessionId, text, seq? }` |
| `typing.cancel` | `{ sessionId }` |

| Server → Client | Payload |
|-----------------|---------|
| `typing.result` | `TypingAnalysisResult` |
| `typing.suggestions` | `{ items: string[] }` |
| `typing.error` | `{ code, message, retryAfterMs? }` |

Stale responses are dropped client-side when `result.seq < latestSeq`.

## Redis keys (Nest)

| Key | TTL |
|-----|-----|
| `typing:v1:{sessionId}:{textHash}` | 10m |
| `ratelimit:typing:{ip}:{sessionId}` | 1m (30 req/min) |

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_TYPING_WS_URL` | Next | Nest base URL (`off` disables WS) |
| `NEXT_TYPING_ANALYZE_URL` | Nest | Next BFF URL for analyze |
| `TYPING_INTERNAL_SECRET` | Nest + Next | Optional internal header |
| `NEST_API_URL` | Next server | Heavy job enqueue |

## Frontend

- `RealtimeNeedInput` on seed step in `NeedIntakePanel`
- Store: `typingAnalysis`, `analysisStatus`, `typingPreloading`
- Preload: TanStack `prefetchQuery` when category stable ×2 and `confidence >= 0.72`

## Heavy job

After `POST /api/need-intake/publish`, Next calls `POST {NEST}/intake-typing/heavy` with `{ requestId, sessionId? }`.

## Tests

```bash
npm run test:typing-analysis
```

## Production notes

- Rules-first; LLM only on submit (`parse-intent`) and heavy queue.
- Redis required in staging/prod for Nest gateway cache and rate limits.
- Horizontal scale: stateless gateway + Redis pub/sub channel `ws:intake-typing`.
