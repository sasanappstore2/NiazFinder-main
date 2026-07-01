# CLAUDE.md

Guidance for working in this repo (NiazFinder / نیازفایندر).

## What this is

A Persian-language **reverse marketplace**: users post a "need" (نیاز) in free Persian
text; an intake engine (rules-first, with an optional local LLM) parses it into structured
fields; the platform matches needs to businesses, who then chat and send proposals.

Main user flow: `home → /post (intake) → /n/{city} (need marketplace) → matching/leads → chat → proposal → review`.

## Stack

- **App:** Next.js 16 (App Router) + React 19 + TypeScript, run on **Bun**.
- **Frontend AND backend live in the Next.js app** — backend is `src/app/api/**/route.ts`
  (216 endpoints). The old NestJS service in `mini-services/backend` is **legacy** (docker `legacy` profile).
- **DB:** PostgreSQL 15 + **pgvector** via Prisma 6. DB name `needfinder`. (Not sqlite — some older docs say sqlite.)
- **UI:** Tailwind v4 + shadcn/ui (Radix), Zustand, TanStack Query, React Hook Form + Zod, MapLibre/Mapbox.
- **Infra (Docker):** postgres(pgvector), redis, minio (object storage), typesense (search),
  rabbitmq (queues), `worker-go` (Go queue consumer), `chat` (Bun/Socket.io realtime).
  AI sidecars `gemma4-intake` + `embed-intake` are under the `ai` profile.

## Run

```bash
# 1. Infra — default stack: postgres, redis, minio, typesense, rabbitmq, worker-go, chat
docker compose up -d
#    add local AI sidecars:  docker compose --profile ai up -d

# 2. Database
npm run db:push            # or: npm run db:migrate
npm run db:seed:locations

# 3. App on :3000  (runs `prisma generate && next dev`, tees to dev.log)
npm run dev

# Realtime chat service (separate process):
npm run dev:chat
```

Copy `.env.example` → `.env.local`. Intake defaults to **rules-only**
(`NEED_INTAKE_LLM_ENABLED=false`); the local LLM is opt-in.

## Where things live

- `src/app/(main|admin|auth|chat)/` — pages, grouped by route group
- `src/app/api/**/route.ts` — API endpoints
- `src/intake/` — **the core**: the need-parsing engine (extractors, normalizer, tokenizer,
  matchers, scoring, validation, wizard, schema-evolution, training, telemetry)
- `src/lib/` — ~46 domain modules: `need-intake`, `smart-matching`, `business`, `chat`,
  `search`, `geo`, `map`, `wallet`, `rbac`, `analytics`, `auth`, …
- `src/lib/filing/` — **filings** (فایلینگ): `schema/`, `content/`, `presentation/`, `browse/`,
  `adapters/`, `ingest/`; public browse `/f`; fixtures at `fixtures/filing-portals/`; see `docs/filing/ARCHITECTURE.md`
- `src/components/`, `src/hooks/`, `src/stores/`
- `prisma/schema.prisma` — 63 models / 25 enums
- `src/middleware.ts` — canonical / legacy URL handling
- `mini-services/` — `worker-go`, `chat-service`, `gemma4-intake`, `embed-intake`, estate scrapers
- `docs/` (~129 files) and `OBISIDIAN/` — extensive design docs;
  `OBISIDIAN/00_Product_MOC/ProductMap.md` is the product overview

## Conventions

- Import alias: `@/*` → `src/*`.
- `mini-services/`, `examples/`, and `**/fixtures/**` are excluded from the root `tsconfig.json`.
- Product is RTL Persian: UI copy in Persian, code/identifiers/commit messages in English.
- Map tiles are served locally via `/api/map/*` (Iran vector + raster).

## Testing

- Many `tsx`-based self-tests: `npm run test:*` and `npm run smoke:*` (see `package.json` scripts).
- Full local gate: `npm run check:all`. Lint: `npm run lint` (`eslint src`).
