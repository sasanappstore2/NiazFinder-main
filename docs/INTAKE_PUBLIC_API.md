# Intake Public API (v1)

**Release tag:** `intake-public-api-v1`  
**OpenAPI:** [`docs/openapi/intake-v1.openapi.yaml`](openapi/intake-v1.openapi.yaml)

## Enable

```bash
INTAKE_PUBLIC_API_ENABLED=true
INTAKE_PARTNER_API_KEYS='[{"key":"sk_live_xxx","partnerId":"acme","tier":"partner","ownerUserId":"<user-uuid>","label":"Acme CRM"}]'
```

## Authentication

| Header | Value |
|--------|-------|
| `X-Intake-Api-Key` | Partner API key |
| `Authorization` | `Bearer <key>` (alternative) |
| `X-Intake-Client` | `mobile` or `partner` (affects tier) |
| `X-NeedDraft-Schema-Version` | `1` or `2` (optional; default migrates to v2) |

Response headers always include:

- `X-Intake-Api-Version: v1`
- `X-NeedDraft-Schema-Version: 2`

## Rate limits (per hour)

| Tier | Default |
|------|---------|
| free | 60 |
| mobile | 120 |
| partner | 600 |

Override via `INTAKE_PUBLIC_API_RATE_*_PER_HOUR` env vars.

## Endpoints

### `POST /api/v1/intake/drafts`

Create (or return existing) draft by `externalRef`.

```json
{
  "draft": { "needType": "plumbing-service-seeking", "schemaVersion": 1, "...": "..." },
  "listingPreview": { "title": "...", "description": "..." },
  "externalRef": "crm-12345"
}
```

### `GET /api/v1/intake/drafts/:id`

Fetch draft owned by the authenticated partner.

### `PUT /api/v1/intake/drafts/:id`

Update draft body / preview.

### `DELETE /api/v1/intake/drafts/:id`

Remove draft from partner store.

### `POST /api/v1/intake/drafts/:id/publish`

Publish draft to `ServiceRequest` using the partner's `ownerUserId`.

```json
{ "listingPreview": { "title": "...", "description": "..." } }
```

## Schema v2

See [`docs/rfc/NEED_DRAFT_V2.md`](rfc/NEED_DRAFT_V2.md). Migration is automatic with shadow comparison logged in the create response (`shadowEqual`, `shadowDiffs`).

## Mobile API-only mode

When `INTAKE_MOBILE_API_ONLY=true`, only mobile-tier keys with `X-Intake-Client: mobile` are accepted. See [`INTAKE_MOBILE_API_PATH.md`](INTAKE_MOBILE_API_PATH.md).

## v0 deprecation

Legacy undocumented routes sunset on `INTAKE_V0_DEPRECATION_DATE` (default `2026-08-01`). See [`INTAKE_V0_DEPRECATION.md`](INTAKE_V0_DEPRECATION.md).

## Conformance

```bash
npm run test:intake-public-api
npm run verify:intake-phase -- --phase 49
```
