## Architecture index (today's map)

> **ایندکس کامل:** برای نقشه سکتوربه‌سکتور با ۱۹۹ API، ۸۵ صفحه، ۵۸ model و ۴۶ ماژول lib → [`PROJECT_INDEX.md`](./PROJECT_INDEX.md)

This document is a short, practical map of the codebase so you can jump to the right entry point quickly.

### Top-level services

- **Frontend (Next.js App Router)**: `src/`
  - **Entry**: `src/app/layout.tsx`, `src/app/page.tsx`
  - **Middleware (canonicalization/legacy redirects)**: `src/middleware.ts`
  - **Route handlers (API)**: `src/app/api/**/route.ts`
  - **Core UI**: `src/components/`
  - **Domain logic**: `src/lib/`
- **Backend API (NestJS)**: `mini-services/backend/`
  - **Entry**: `mini-services/backend/src/main.ts`
  - **Module wiring**: `mini-services/backend/src/app.module.ts`
  - **HTTP prefix**: `/api/*` (global prefix `api`, health excluded)
  - **Swagger**: `/api/docs`
- **Chat service (Socket.io, standalone)**: `mini-services/chat-service/`
  - **Entry**: `mini-services/chat-service/index.ts`
  - **Rooms**: `user:{userId}`, `conv:{conversationId}`

### Data / persistence

- **Prisma (root)**: `prisma/schema.prisma` (expects `DATABASE_URL`, currently sqlite provider)
- **Prisma (backend)**: `mini-services/backend/prisma/schema.prisma` (sqlite file url, used for compatibility)
- **Prisma (chat-service)**: `mini-services/chat-service/prisma/schema.prisma` (expects `DATABASE_URL`)

### Reverse proxy / infra (mostly for deploy)

- `docker-compose.yml`: postgres + redis + backend + chat + frontend + caddy
- `Caddyfile`: reverse proxy to `frontend:3000`

### Most-used “work areas” by feature

- **Need intake / typing analysis / internal orchestration**: `src/lib/need-intake/`, `src/lib/typing-analysis/`, `src/app/api/need-intake/**`
- **Marketplace browsing + canonical URLs**: `src/config/market-routes.ts`, `src/lib/search/**`, `src/middleware.ts`
- **Chat UI**: `src/components/chat/**`, `src/lib/chat-socket-config.ts`
- **Admin / moderation**: `src/app/api/internal/**`, `src/lib/request-moderation/**`, backend `mini-services/backend/src/modules/**`

