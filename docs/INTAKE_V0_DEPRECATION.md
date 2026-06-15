# Intake v0 Route Deprecation Timeline

**Phase 49.9** ? documents sunset of undocumented / legacy intake HTTP surfaces.

## Timeline

| Date | Milestone |
|------|-----------|
| 2026-06-10 | Phase 49 ships `/api/v1/intake/*` with OpenAPI + conformance |
| 2026-06-24 | Shadow v1?v2 migration complete (2 weeks) |
| 2026-07-15 | Partners must use v1 public API for new integrations |
| **2026-08-01** | **v0 undocumented routes return `410 Gone`** (configurable) |

Default sunset date: `INTAKE_V0_DEPRECATION_DATE=2026-08-01`

## v0 surfaces (deprecated)

- Ad-hoc internal fetch patterns against `/api/need-intake/*` from external apps
- Direct publish without API key from non-browser clients
- Undocumented draft persistence endpoints (pre-v1)

## Supported path (v1)

- `POST /api/v1/intake/drafts`
- `POST /api/v1/intake/drafts/:id/publish`
- OpenAPI: `docs/openapi/intake-v1.openapi.yaml`

## Web wizard

The `/post` wizard remains supported for browser users. Public API is additive ? not a replacement for the web UX.

## Migration checklist for partners

1. Request API key (`INTAKE_PARTNER_API_KEYS` registry)
2. Run `npm run test:intake-public-api` conformance locally
3. Send `X-NeedDraft-Schema-Version: 2` after shadow window
4. Monitor `429` rate-limit headers and backoff
