---
title: "ADR-0002: Typesense browse with Prisma fallback"
date: 2026-07-12
status: accepted
supersedes: []
superseded_by: null
---

# ADR-0002: Typesense browse with Prisma fallback

## Context

Business marketplace browse needs fast search/facets. Typesense runs in docker-compose. Neighborhood filtering is important for Iranian geo UX, but neighborhood is not in the Typesense collection schema today.

## Decision

1. Typesense is **enabled by default** for business profile search (`TYPESENSE_ENABLED` only disables when `false`).
2. `predev` runs `ensure:typesense` to start/health/sync empty collections.
3. Sync is **explicit** `queueBusinessProfileTypesenseSync` on relevant mutations (not Prisma middleware).
4. If Typesense is disabled or unhealthy, browse uses **Prisma** fallback search.
5. **Neighborhood filters always use DB** until a future ADR adds an index field + backfill.
6. `category` in Typesense is `string[]` of **occupation slugs** from `BusinessProfile.categorySlugs`.

## Consequences

### Positive

- Fast text/facet browse when healthy
- Hard degrade path without Typesense
- Clear sync call sites

### Negative / risks

- Neighborhood cannot be pushed entirely into Typesense without schema work
- Missed sync hooks → stale documents

### Rollback

`TYPESENSE_ENABLED=false`; browse via Prisma.

## Alternatives considered

| Option | Why not (now) |
|--------|----------------|
| Prisma-only browse | Weaker search UX at scale |
| Prisma middleware sync | Hidden side effects on batch jobs |
| Index neighborhoods immediately | Needs ADR, backfill, reindex — tracked as OD-20260712-01 |

## Implementation notes

- `src/lib/search/typesense-*.ts`
- `docs/TYPESENSE_SYNC.md`
- OS: `07_TYPESENSE.md`

## Validation

- ensure/sync scripts; browse API with Typesense up/down
- `test:neighborhood-filter-parity`
