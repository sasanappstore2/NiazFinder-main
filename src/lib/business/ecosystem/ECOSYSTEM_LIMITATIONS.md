# Ecosystem — Known Limitations & Migration Notes

Status: real-estate launch. This document records the deliberate, audited
limitations of the current implementation and the safe path to extend it.

## H1 — JSON payload growth in `BusinessProfile.extensions`

All ecosystem data (specializations, service areas, network connections,
referrals, knowledge articles, verification documents, reputation snapshot,
widget config) is stored as JSON under `BusinessProfile.extensions.ecosystem`.

**Current mitigations**

- All owner-writable arrays and strings are bounded by Zod limits in
  [`validation.ts`](./validation.ts) (e.g. articles ≤ 100, referrals ≤ 500,
  article body ≤ 20 000 chars), which caps per-row growth.

**Remaining risk (not addressed in this sprint)**

- `extensions` is parsed on every profile load (`map-profile.ts`). Large
  knowledge-article bodies inflate the payload of the public
  `GET /api/business/[id]` response.
- **Recommended future migration:** move large/unbounded collections
  (knowledge articles, referrals, connections, verification documents) to
  dedicated tables; keep only small config + a reputation snapshot in
  `extensions`. This is a schema change and was intentionally out of scope for a
  no-redesign remediation sprint.

## M9 — Vertical coupling (vehicle readiness)

`WIDGET_REGISTRY` is keyed directly by real-estate occupation slugs and typed as
`Record<RealEstateSubtype, WidgetDefinition[]>`. The **widget engine**
(`DynamicWidgetRenderer`, `widget-config`) is already vertical-agnostic and
resolves the subtype purely from `business.identity.category` against the
registry keys (single source of truth — no second slug list).

**To add a new vertical (vehicles / jobs / services):**

1. Nest the registry: `Record<Vertical, Record<SubtypeSlug, WidgetDefinition[]>>`.
2. Derive the vertical from the taxonomy root (sector slug) of the profile's
   category, then resolve subtype within that vertical.
3. Add vertical-specific widget components; the ecosystem widgets
   (reputation, verification, specialization, coverage, network, knowledge,
   matching insights, request hub) are already category-agnostic and can be
   reused unchanged.

No engine rewrite is required — only the registry shape and the one resolver in
`widget-config.ts` change. Subtype slugs must always equal canonical taxonomy
slugs (kebab-case); never introduce an alternate format.

## Scope notes

- The super-admin ecosystem endpoint
  (`/api/super-admin/businesses/[id]/ecosystem`) is functional and authorized
  (`market:businesses:write`) but has no admin UI wired yet.
- The admin-set reputation snapshot is stored but the profile widget currently
  always recomputes client-side; wire the snapshot read before relying on
  manual overrides.
