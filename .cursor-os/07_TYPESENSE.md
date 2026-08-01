# 07 — Typesense

## Current truth

| Fact | Detail |
|------|--------|
| Default | **ON** unless `TYPESENSE_ENABLED=false` |
| Image | `typesense/typesense:27.1` on `:8108` |
| Collection | Business profiles (`BUSINESS_PROFILES_COLLECTION`) |
| Bootstrap | `predev` → `npm run ensure:typesense` (start + health + sync if empty) |
| Full reindex | `npm run sync:typesense` |
| Browse fallback | Prisma `contains` search when Typesense disabled/unhealthy |
| **Neighborhoods** | **NOT in schema** — filter via DB |
| **Category** | `string[]` of **occupation slugs** from `categorySlugs` |

Sources: `docs/TYPESENSE_SYNC.md`, `docs/ENV_MAP.md`, `src/lib/search/typesense-*.ts`.

---

## Document schema

From `businessProfilesCollectionSchema`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `title` | string | Business name |
| `category` | string[] facet | Occupation slugs |
| `city` | string facet | |
| `province` | string facet | |
| `location` | geopoint optional | `[lat, lng]` |
| `rating` | float | **default_sorting_field** |
| `review_count` | int32 | |
| `verified` | bool facet | |
| `slug` | string | |
| `user_id` | string | |
| `tags` | string[] optional | |
| `view_count` | int32 | |
| `created_at` | int64 | ms epoch |
| `description` | string optional | |
| `logo` | string optional | |

**Absent:** `neighborhood`, Persian category labels, need documents (needs are not this collection).

---

## Sync strategy

**Implemented:** explicit `queueBusinessProfileTypesenseSync(profileId)` after mutations (fire-and-forget; log failures; do not block API).

Wired in (non-exhaustive — verify when editing):

- `src/lib/business/ensure-profile.ts`
- `src/app/api/business/me/route.ts`
- `src/app/api/business/me/onboarding/route.ts`
- `src/app/api/business/me/categories/route.ts`
- super-admin moderate route

**Not enabled:** Prisma `$extends` middleware auto-sync (documented alternative only).

Indexability: `status === 'ACTIVE'` and user active.

---

## Browse path

`GET /api/business/browse` → `listBusinesses(...)` with city/province/neighborhood/search/geo params.

- Text/category/city/province/sort: Typesense when available
- **Neighborhood filters: DB**
- Geo radius may use location geopoint when present; verify implementation in load-profile / search modules before changing

Env:

| Var | Default |
|-----|---------|
| `TYPESENSE_ENABLED` | on (only `false` disables) |
| `TYPESENSE_API_KEY` | must match docker `--api-key` (dev key in `.env.example`) |
| `TYPESENSE_HOST` | `127.0.0.1` |
| `TYPESENSE_PORT` | `8108` |
| `TYPESENSE_PROTOCOL` | `http` |

---

## Gaps & target state

| Gap | Current | Target (needs ADR) |
|-----|---------|-------------------|
| Neighborhood facet/filter in Typesense | Missing — DB fallback | Optional field + backfill + sync |
| Need search collection | Not this doc’s collection | Separate design if required |
| Prisma middleware sync | Off | Only if ops wants centralization |
| Multi-region Typesense | Not in repo | Do not invent |

---

## Failure modes

| Symptom | Check |
|---------|-------|
| Empty browse | ensure:typesense / sync; docker health |
| Stale profile | mutation missing queue sync call |
| Neighborhood filter wrong | expecting Typesense — use DB path; run parity test |
| Category mismatch | indexing labels instead of slugs — bug |
| CI without docker | disable Typesense or ensure fallback tests |

---

## Change checklist

Adding a field:

1. ADR (schema is cross-cutting)
2. Update `BusinessProfileSearchDocument` + collection schema
3. Mapper `businessProfileToTypesenseDocument`
4. Migration/backfill plan for existing docs (reindex)
5. Search/filter code + tests
6. Update this OS file + `docs/TYPESENSE_SYNC.md`
7. Rollback: Prisma browse still works with `TYPESENSE_ENABLED=false`

---

## Anti-patterns

- Assuming Typesense holds needs or neighborhoods
- Blocking HTTP on sync errors
- Using Persian display names as `category` facet values
- Documenting Typesense as off-by-default (stale)
