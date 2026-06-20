## Architecture index (today's map)

> **ایندکس کامل:** برای نقشه سکتوربه‌سکتور با ۲۱۶ API، ۸۵ صفحه، ۶۳ model و ۴۶ ماژول lib → [`PROJECT_INDEX.md`](./PROJECT_INDEX.md)

This document is a short, practical map of the codebase so you can jump to the right entry point quickly.

### Top-level services

- **Frontend + Backend (Next.js App Router)**: `src/`
  - **Entry**: `src/app/layout.tsx`, `src/app/page.tsx`
  - **Middleware (canonicalization/legacy redirects)**: `src/middleware.ts`
  - **Route handlers (API, ~216 endpoints)**: `src/app/api/**/route.ts`
  - **Core UI**: `src/components/`
  - **Domain logic**: `src/lib/`
- **Backend API (NestJS — LEGACY, docker `legacy` profile; superseded by Next.js `src/app/api/**`)**: `mini-services/backend/`
  - **Entry**: `mini-services/backend/src/main.ts`
  - **Module wiring**: `mini-services/backend/src/app.module.ts`
  - **HTTP prefix**: `/api/*` (global prefix `api`, health excluded)
  - **Swagger**: `/api/docs`
- **Chat service (Socket.io, standalone)**: `mini-services/chat-service/`
  - **Entry**: `mini-services/chat-service/index.ts`
  - **Rooms**: `user:{userId}`, `conv:{conversationId}`
- **Queue worker (Go)**: `mini-services/worker-go/` — consumes RabbitMQ (intake AI, analytics, matching)

### Data / persistence

- **Prisma (root)**: `prisma/schema.prisma` — **PostgreSQL 15 + pgvector** via `DATABASE_URL` (db `needfinder`)
- **Prisma (backend)**: `mini-services/backend/prisma/schema.prisma` (legacy backend, sqlite file url)
- **Prisma (chat-service)**: `mini-services/chat-service/prisma/schema.prisma` (expects `DATABASE_URL`)

### Reverse proxy / infra (mostly for deploy)

- `docker-compose.yml` (default stack): postgres(pgvector) + redis + minio + typesense + rabbitmq + worker-go + chat. AI sidecars (`gemma4-intake`, `embed-intake`) under the `ai` profile; `backend`/`frontend`/`caddy` under the `legacy` profile.
- `Caddyfile`: reverse proxy to `frontend:3000` (legacy)

### Most-used “work areas” by feature

- **Need intake / typing analysis / internal orchestration**: `src/lib/need-intake/`, `src/lib/typing-analysis/`, `src/app/api/need-intake/**`
- **Marketplace browsing + canonical URLs**: `src/config/market-routes.ts`, `src/lib/search/**`, `src/middleware.ts`
- **Chat UI**: `src/components/chat/**`, `src/lib/chat-socket-config.ts`
- **Admin / moderation**: `src/app/api/internal/**`, `src/lib/request-moderation/**`, backend `mini-services/backend/src/modules/**`
