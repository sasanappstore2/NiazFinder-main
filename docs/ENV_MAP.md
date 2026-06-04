## Environment variables map (where used)

This is a practical index of env vars that affect local dev and common debugging.

### Next.js (root app) — public URLs

- **`NEXT_PUBLIC_API_URL`**
  - **Used in**: `src/lib/api-client.ts`
  - **Role**: base origin for API requests; `api-client` appends `/api{path}?XTransformPort=4000`
  - **Local default**: not defaulted (empty string) → you should set it

- **`NEXT_PUBLIC_CHAT_SOCKET_URL`**
  - **Used in**: `src/lib/chat-socket-config.ts`
  - **Role**: Socket.io base URL for chat gateway (Nest, default `http://localhost:4000`)
  - **Disable**: set to `off` / `false` / `0`

- **`NEXT_PUBLIC_TYPING_WS_URL`**
  - **Used in**: `src/lib/typing-socket-config.ts`
  - **Role**: Socket.io base URL for intake typing namespace (Nest, default `http://localhost:4000`)
  - **Disable**: set to `off` / `false` / `0`

### Next.js (server/runtime) — internal calls and secrets

- **`NEST_API_URL`**, **`NEXT_PUBLIC_NEST_API_URL`**
  - **Used in**: `src/lib/need-intake/enqueue-heavy.ts`
  - **Role**: where Next enqueues the heavy BullMQ job on Nest (`POST /api/intake-typing/heavy`)
  - **Local default**: `http://127.0.0.1:4000`

- **`NEST_BACKEND_URL`**, **`BACKEND_URL`**
  - **Used in**: `src/lib/request-moderation/enqueue.ts`
  - **Role**: if set, Next calls Nest internal endpoint to enqueue moderation

- **`INTERNAL_API_SECRET`**
  - **Used in**: `src/lib/request-moderation/enqueue.ts`, `src/app/api/internal/**`, `src/lib/communication/redis-publish.ts`
  - **Role**: **Required in production** — `x-internal-secret` for internal routes and chat-service HTTP fanout
  - **Fail-closed**: without it, `/api/internal/request-moderation` returns 503

- **`CHAT_INTERNAL_SECRET`**
  - **Used in**: `mini-services/chat-service` `/internal/fanout`
  - **Role**: same value as `INTERNAL_API_SECRET` if not set separately

- **`SUPER_ADMIN_PHONES`**
  - **Used in**: `src/lib/super-admin.ts`
  - **Role**: comma-separated phones allowed SUPER_ADMIN role (replaces hardcoded phone)

- **`ALLOW_TEST_OTP`**
  - **Used in**: `src/lib/auth/test-otp.ts`
  - **Role**: set `true` to allow test OTP `1234` in production (default: blocked in prod)

- **`TURN_STATIC_AUTH_SECRET`** / **`TURN_SECRET`**
  - **Used in**: `config/turnserver.conf`, voice credentials API
  - **Role**: WebRTC TURN auth — must not use default `change-me-turn-secret` in prod

- **`NEXT_PUBLIC_STUN_URLS`**
  - **Used in**: `src/lib/voice/turn-credentials.ts`
  - **Role**: comma-separated STUN URLs (default: `stun:127.0.0.1:3478` or `stun:${TURN_HOST}:3478` — no Google STUN)

- **`NEXT_PUBLIC_TURN_HOST`** / **`TURN_HOST`**
  - **Used in**: `src/lib/voice/turn-credentials.ts`, coturn
  - **Role**: internal TURN/STUN host for WebRTC

- **`NOMINATIM_ENABLED`**
  - **Used in**: `src/app/api/locations/reverse-geocode/route.ts`
  - **Role**: set `true` to call OpenStreetMap Nominatim (default: off — catalog-only GPS city match)
  - **Future**: internal Redis cache + nominatim proxy

- **`MINIO_PUBLIC_URL`**
  - **Used in**: `src/lib/storage/minio.ts`, `next.config.ts` `images.remotePatterns`, CSP
  - **Role**: public origin for internal MinIO objects (only external hostname allowed in Next image optimizer)

- **`TYPING_INTERNAL_SECRET`**
  - **Used in**: `src/app/api/need-intake/typing-analyze/route.ts`
  - **Role**: internal secret for typing analysis path (Next ↔ Nest)

- **`NEED_LEAD_DISPATCH_SECRET`**
  - **Used in**: `src/app/api/admin/need-leads/dispatch/route.ts`
  - **Role**: protects manual lead dispatch endpoint

### Need-intake knobs (Next)

- **`NEED_INTAKE_SKIP_PROCESSING_DELAY`**
  - **Used in**: `src/lib/need-intake/internal-orchestrator.ts`
  - **Role**: skips a small UX delay in dev when set to `'true'`

- **`NEED_INTAKE_PARSE_CACHE_TTL_MS`**
  - **Used in**: `src/lib/need-intake/parse-cache.ts`
  - **Role**: in-memory parse cache TTL
  - **Example**: in `.env.example`

- **`NEED_INTAKE_LLM_ENABLED`**
  - **Used in**: `src/lib/need-intake/qwen-intake-client.ts`, `parse-intent` route, `analysis-from-qwen.ts`, `generate-listing-title.ts`
  - **Role**: enable Qwen intake via local MLX service (`'true'` in dev on Mac)
  - **Default**: unset / false

- **`NEED_INTAKE_LLM_URL`**
  - **Used in**: `src/lib/need-intake/qwen-intake-client.ts`
  - **Role**: base URL for `mini-services/intake-mlx` (default `http://127.0.0.1:8100`)

- **`NEED_INTAKE_LLM_TIMEOUT_MS`**
  - **Used in**: `src/lib/need-intake/qwen-intake-client.ts`
  - **Role**: fetch timeout for MLX parse/title (default `12000`)

- **`NEED_INTAKE_TITLE_AI_ENABLED`**
  - **Used in**: `src/lib/need-intake/generate-listing-title.ts`
  - **Role**: set `false` to skip AI and use template titles only; default auto when `NEED_INTAKE_LLM_ENABLED=true`

- **Intake AI = Qwen only** — parse, analyze, and title use `mini-services/intake-mlx` (Qwen3.5-2B). Rules engine remains as hybrid fallback when MLX is down. LM Studio / Ollama are **not** used for need intake when `NEED_INTAKE_LLM_ENABLED=true`.

- **`AI_SEMANTIC_RESOLVER_ENABLED`**, **`OLLAMA_URL`**, **`OLLAMA_MODEL`**
  - **Used in**: `src/ai/**` (legacy semantic resolver; skipped for intake analyze when Qwen is enabled)

- **Home lead mic (browser only)**
  - **Used in**: `src/hooks/use-speech-to-text.ts`, `src/lib/voice/browser-speech.ts`
  - **Requires**: Chrome or Edge on HTTPS/localhost (`window.SpeechRecognition`). Safari/Firefox: mic hidden.

- **Lead outreach knobs** (examples live in `.env.example`)
  - `LEAD_OUTREACH_ENABLED`
  - `LEAD_MIN_MATCH_SCORE`
  - `LEAD_OUTREACH_DAILY_CAP_PER_BUSINESS`
  - `LEAD_OUTREACH_MAX_PER_REQUEST`
  - **Used in**: `src/lib/need-leads/env.ts`

### Nest backend (`mini-services/backend`) — DB/Redis/JWT

- **Database (TypeORM / Postgres)**:
  - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
  - **Used in**: `mini-services/backend/src/database/database.module.ts`

- **Redis**:
  - `REDIS_URL` or (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`)
  - **Used in**: `mini-services/backend/src/common/redis/redis.module.ts` and module services (chat/notifications/etc.)

- **JWT**:
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`
  - **Used in**: `mini-services/backend/src/modules/auth/**` and gateways

### Prisma (schemas)

- **`DATABASE_URL`**
  - **Used in**: `prisma/schema.prisma`, `mini-services/chat-service/prisma/schema.prisma`
  - **Role**: Prisma datasource URL

