# Audit 01 — Architecture Inventory

**Date:** 2026-07-12  
**Phase:** PHASE-01 Project Audit  
**Method:** filesystem scan + key path verification (not chat memory)

---

## Scale snapshot

| Area | Approx. TS/TSX (or noted) |
|------|---------------------------|
| `src/app` | ~378 |
| `src/components` | ~604 |
| `src/hooks` | ~65 |
| `src/lib` | ~791 |
| `src/intake` | ~239 |
| `src/contracts` | ~16 |
| `src/stores` | 1 (`need-intake-store`) |
| `scripts` | ~194 |
| `src/app/api/**/route.ts` | **241** |
| Prisma models / enums | **75 / 31** |
| `mini-services` | large (Nest legacy, chat, workers, AI sidecars) |

---

## Inventory by domain

### Frontend
- Next.js App Router: `src/app/(main|admin|auth|chat)/`
- UI: `src/components/**` (shadcn/Radix, Tailwind)
- Intake UI: `src/components/need-intake/**`
- Backup UI tree: `src/components/need-intake.backup.20260711/**` (not live)

### Backend / API
- **Primary:** `src/app/api/**/route.ts` (Next)
- **Legacy:** `mini-services/backend` (Nest, docker `legacy` profile)

### Store
- Zustand: `src/stores/need-intake-store.ts`

### Hooks
- Intake family: `src/hooks/use-intake-*.ts`, `use-realtime-extraction.ts`, location/draft/publish/intelligence
- Other domain hooks under `src/hooks/**`

### Types / contracts
- `src/contracts/**` (incl. need-intake)
- Prisma generated client

### Database / Prisma
- Postgres via `prisma/schema.prisma` (`provider = postgresql`)
- DB name `needfinder` (ops truth)

### Queue
- RabbitMQ + `worker-go` (`mini-services/worker-go`)
- Intake queue routes under `src/app/api/need-intake/queue/**`

### LLM
- Optional local (llama-server / Gemma) via env
- Hybrid: `src/intake/intelligence-engine/hybrid/**`
- Sidecars under docker `ai` profile (gemma4-intake, embed)

### Rule Engine
- `src/intake/rules/**` (registry, packs, config thresholds)

### Typesense
- Client/index/search/sync: `src/lib/search/typesense-*.ts`
- Script: `scripts/sync-typesense.ts`, `scripts/ensure-typesense.sh`
- Collection: `business_profiles` (business browse only)

### Need Engine / Intelligence
- `src/intake/intelligence-engine/**`, `src/intake/agent/**`, `src/lib/need-intake/**`
- Entry UX: `/post` → `NeedIntakePanel`

### Validation
- `src/intake/validation/publishValidator.ts` (+ related)

### Ranking / matching
- `src/lib/need-match/**`, smart-matching libs/APIs

### Telemetry / monitoring
- `src/intake/telemetry/**`, `use-post-intake-telemetry`, analytics docs
- Ops docs: `docs/INCIDENT_RUNBOOK.md`, Cursor OS `14_MONITORING.md`

### Tests
- `npm run test:post-pipeline`, `test:hybrid-intake-golden`, `test:intake-merge-policy`, many `test:intake-*`, `check:all`
- Fixtures under `src/intake/fixtures`, `src/lib/need-intake/fixtures`

### Scripts
- `scripts/**` (sync, smoke, stress, ensure-typesense, crawl, …)

### Engineering OS
- `.cursor-os/**` (Mission, memory, phases, ADRs, RFCs, audits)
- `docs/engineering-constitution/**`
- `docs/POST_SYSTEM_REPORT.md`

---

## Not in scope as “need authority”

Typesense, Nest legacy, social `/post/[id]` — must not be confused with Need Intelligence SoT.
