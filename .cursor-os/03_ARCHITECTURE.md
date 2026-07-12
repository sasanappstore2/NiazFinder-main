# 03 — Architecture

## Current truth vs target

| | Current truth | Target state (aspirational) |
|--|---------------|-----------------------------|
| API ownership | Next.js App Router `src/app/api/**` | Same (Nest stays legacy) |
| Runtime | Bun + `next dev` on :3000 | Same unless hosting docs change |
| Search | Typesense + Prisma fallback | Possibly richer geo index (needs ADR) |
| AI | Opt-in local LLM / docker AI profiles | Prod still rules-first per ENV_MAP |
| Hosting | Local docker-compose evidenced | Do not invent K8s/cloud here |

---

## System map

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (RTL Persian UI)                                   │
│  Next.js 16 + React 19 — pages in src/app/(main|admin|…)    │
└───────────────┬─────────────────────────────┬───────────────┘
                │ HTTP /api/*                 │ Socket.io
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│  Next.js API routes       │    │  chat-service (:3004)      │
│  src/app/api/**/route.ts  │    │  mini-services/chat-service│
└───────────┬───────────────┘    └─────────────┬──────────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│  Domain libs              │    │  Postgres + Redis          │
│  src/lib/*, src/intake/*  │    └────────────────────────────┘
└───────┬─────────┬─────────┘
        │         │
        ▼         ▼
   Prisma/PG   Typesense (:8108)
        │
        ▼
   RabbitMQ → worker-go (queues: intake/analytics/matching)
```

**Legacy (profile `legacy` only):** Nest `mini-services/backend` + old frontend/caddy. Do not add new product features there.

---

## Route groups (app)

| Group | Role |
|-------|------|
| `(main)` | Marketplace, `/post`, `/n/{city}`, business browse |
| `(auth)` | Auth flows |
| `(admin)` | Admin / super-admin |
| `(chat)` | Chat UI shells |

Canonical vs legacy URLs: `src/middleware.ts`.

---

## Core domains

| Domain | Primary paths |
|--------|----------------|
| Need intake | `src/intake/`, `src/lib/need-intake/`, `src/components/need-intake/` |
| Categories / occupations | `src/lib/categories/`, `src/lib/business/` |
| Business profiles | `src/lib/business/`, Prisma `BusinessProfile` |
| Search | `src/lib/search/typesense-*.ts` |
| Matching | `src/lib/need-match/`, `src/lib/smart-matching/` |
| Chat | `src/lib/chat/`, chat-service |
| Wallet / leads | `src/lib/wallet/`, smart-matching wallet fee |
| Geo / map | `src/lib/geo/`, `src/lib/map/`, `/api/map/*` |
| RBAC / auth | `src/lib/auth*`, `src/lib/rbac/` |
| Analytics | `src/lib/analytics/`, RabbitMQ analytics queue |

---

## Docker services

### Default stack (`docker compose up -d`)

| Service | Port (host) | Role |
|---------|-------------|------|
| postgres (pgvector/pg15) | 5432 | Primary DB |
| redis | 6379 | Cache / chat deps |
| minio | 9000 / 9001 | Object storage |
| typesense | 8108 | Business search |
| rabbitmq | 5672 / mgmt | Queues |
| worker-go | 8081 health | Consumers |
| chat | 3004 | Realtime |

### Profiles

| Profile | Services |
|---------|----------|
| `ai` | `gemma4-intake`, `embed-openai` |
| `ai-docker` | `ollama`, `ollama-init` |
| `legacy` | `backend` (Nest), `frontend`, `caddy` |

Local LLM via **LM Studio** on `:1234` is common and does not require docker AI profile.

---

## App boot (dev)

```bash
docker compose up -d
npm run db:push          # or db:migrate
npm run db:seed:locations
npm run dev              # predev → ensure:typesense
npm run dev:chat         # if socket needed separately from compose chat
```

Copy `.env.example` → `.env.local`.

---

## Intake architecture (summary)

```text
User text → normalize/tokenize → rules extractors / intelligence-engine
        → optional hybrid LLM cascade (flagged)
        → field bag + confidence
        → UI auto-apply (≥0.85 category) + location apply
        → wizard gaps → publish validator → ServiceRequest
```

Deep dive: `08_NEED_ENGINE.md`, `05_RULE_ENGINE.md`, `06_AI_ENGINE.md`.

---

## Search architecture (summary)

```text
BusinessProfile mutation → queueBusinessProfileTypesenseSync (fire-and-forget)
Browse → Typesense if healthy & not disabled
       → else Prisma contains search
Neighborhood filter → always DB path (not in Typesense schema)
category facet → string[] occupation slugs
```

Deep dive: `07_TYPESENSE.md`.

---

## Matching architecture (summary)

```text
Need context → findCandidateBusinesses → deterministic rule rank
VIP broadcast → qualify by min score + wallet balance + private lead caps
```

Deep dive: `09_RANKING.md`.

---

## Chat architecture (summary)

- Gateway: Bun Socket.io service, default `http://localhost:3004`, path `/socket.io`
- Config: `src/lib/chat-socket-config.ts` — disabled if URL `off` or unset in some modes
- Nest namespace only if explicitly enabled (`NEXT_PUBLIC_CHAT_SOCKET_USE_NEST_NAMESPACE`)
- Internal HTTP: `CHAT_SERVICE_INTERNAL_URL` / secrets in env

---

## Shadow / research engines (do not confuse with prod `/post`)

Present in tree for evaluation:

- `src/cognitive-engine/`
- `src/semantic-evaluation-engine/`
- `src/ccqs/`
- `src/intake.backup.*` (backup — do not edit as primary)

Product changes go through the live intake + API routes. Shadow compare tests exist; keep them non-authoritative for publish unless flagged.

---

## Import alias

`@/*` → `src/*`

Excluded from root tsconfig: `mini-services/`, `examples/`, `**/fixtures/**` (fixtures still run via `tsx` scripts).

---

## Anti-patterns

1. New product API in Nest legacy service
2. Embedding neighborhood into Typesense without ADR
3. Calling external cloud LLM when `LOCAL_LLM_ONLY` expected
4. Bypassing publish validators
5. Assuming sqlite (obsolete docs)

---

## Key references

- `CLAUDE.md` — short boot
- `docs/ENV_MAP.md` — flags
- `docs/TYPESENSE_SYNC.md` — sync
- `OBISIDIAN/00_Product_MOC/ProductMap.md` — product map (design)
- `PLAN/claude-cursor-bridge.md` — recent intake loop status (may lag)
