# 04 — Database

## Current truth

| Item | Value |
|------|--------|
| Engine | PostgreSQL 15 + **pgvector** (`pgvector/pgvector:pg15`) |
| ORM | Prisma 6 |
| DB name | `needfinder` (docker default) |
| Schema file | `prisma/schema.prisma` |
| **Not** sqlite | Older docs mentioning sqlite are stale |

### Model / enum counts

**Always recount from schema** — prose lags:

```bash
rg -c "^model " prisma/schema.prisma
rg -c "^enum " prisma/schema.prisma
```

As of OS v1 seed (2026-07-12): approximately **75 models / 31 enums**. `CLAUDE.md` may still say 63/25 — prefer schema.

---

## Domain model clusters

### Identity & admin

- `User`, `AuthToken`, `UserRole`
- Staff: `StaffRole`, `StaffPermission`, `StaffRolePermission`, `UserStaffRole`
- Audits: `AdminAuditLog`, `StaffAuditLog`, `AdminLog`

### Locations (intake geo)

- `IntakeProvince`, `IntakeCity`, `IntakeNeighborhood`, `IntakeLocationAlias`
- `Location` + `LocationType`
- Seed: `npm run db:seed:locations`

### Needs / requests

- `ServiceRequest` — primary need listing entity
- `NeedIntakeSession`, intake training / validation / migration events
- Budget / priority / request status enums
- Access: `NeedAccessStatus`, `NeedChatSession`, `NeedAccessPhase`
- Leads: `NeedLeadOutreach`, `NeedBrowseAlert`

### Business

- `BusinessProfile` — public marketplace profile (`categorySlugs` JSON string, city/province/lat/lng, status, rating, …)
- Members, invites, contact points, offers, portfolio, reviews
- `BusinessLocation`

### Commerce / trust

- `Proposal` + `ProposalStatus`
- `Wallet`, `Transaction`
- `Review`, `Report`, `Coupon`, `Referral`, `Bookmark`

### Chat

- `Conversation`, `Message`, `MessageDelivery`, `MessageReaction`
- `VoiceCall`, `UserBlock`
- Agent memory summaries (`AgentUserMemory`, …)

### Analytics / content

- Analytics session/event/rollups
- `BlogPost`, business analytics daily
- Social-ish: `UserPost`, comments, likes, follows

### Quality systems (CCQS)

- Engine versions, replay runs, gate policies/verdicts, metric snapshots, alerts

---

## BusinessProfile ↔ search

Critical fields for Typesense mapping (`src/lib/search/typesense-business-index.ts`):

| DB | Typesense |
|----|-----------|
| `id` | `id` |
| `name` | `title` |
| `categorySlugs` (JSON string array) | `category` `string[]` |
| `city` / `province` | faceted strings |
| `lat`/`lng` | optional `geopoint` `location` |
| `tags` JSON | `tags` |
| rating, reviewCount, verified, slug, viewCount, createdAt | mirrored |
| **neighborhood** | **not indexed** |

Indexable when `status === 'ACTIVE'` and user not inactive.

---

## pgvector usage

- Image includes pgvector; embeddings used in AI-agent / intake-agent vector search helpers (`src/lib/ai-agent/pgvector.ts`, `src/lib/intake-agent/intake-vector-search.ts`).
- Not a substitute for Typesense business browse.
- Embedding gateway often local (`embed-openai` profile or LM Studio-compatible embeddings).

---

## Migrations workflow

```bash
npm run db:push      # iterative local
npm run db:migrate   # migration files when used
npx prisma generate  # via dev scripts
npx prisma validate  # in check:all
```

Rules:

- Additive columns preferred
- Never drop production columns without expand/contract plan
- After schema change affecting browse documents → plan Typesense reindex (`npm run sync:typesense`)

---

## Access patterns

| Pattern | Location |
|---------|----------|
| Shared Prisma client | `src/lib/db.ts` |
| Health | `src/lib/db-health.ts` |
| Raw SQL for vectors | limited helpers with parameterized literals |

Avoid creating new Prisma clients per request.

---

## Neighborhood truth

Neighborhoods live in Postgres (`IntakeNeighborhood` / request filters). Browse neighborhood filters are **DB-side**. Typesense cannot filter neighborhoods until an ADR adds a field + backfill.

Parity test: `npm run test:neighborhood-filter-parity`.

---

## Data connector storage

Imported/fixture listing text may appear in scripts and filing modules. Production persistence of third-party ads requires legal basis and clear source fields (see `01_SYSTEM_RULES.md`). Prefer storing **normalized need drafts**, not raw scrape payloads with PII.

---

## Checklist for schema PRs

- [ ] Update Prisma schema + generate
- [ ] Migration strategy noted
- [ ] Indexes for new query paths
- [ ] Typesense impact assessed
- [ ] ADR if cross-cutting
- [ ] Recount note if CLAUDE.md model counts mentioned
- [ ] No secrets in seed data
