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
  - **Used in**: `src/lib/request-moderation/enqueue.ts` and `src/app/api/internal/**`
  - **Role**: optional `x-internal-secret` header for internal Next route protection

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
  - **Used in**: `src/lib/need-intake/llm-parse-client.ts`, `parse-intent` route
  - **Role**: enable hybrid parse via local MLX service (`'true'` in dev only)
  - **Default**: unset / false

- **`NEED_INTAKE_LLM_URL`**
  - **Used in**: `src/lib/need-intake/llm-parse-client.ts`
  - **Role**: base URL for `mini-services/intake-mlx` (default `http://127.0.0.1:8100`)

- **`NEED_INTAKE_LLM_TIMEOUT_MS`**
  - **Used in**: `src/lib/need-intake/llm-parse-client.ts`
  - **Role**: fetch timeout for MLX parse (default `8000`)

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

