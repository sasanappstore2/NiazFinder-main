# Mobile App ? API-Only Intake Path

**Phase 49.8**

Mobile clients should use the public intake API instead of embedding the `/post` web wizard.

## Configuration

```bash
INTAKE_PUBLIC_API_ENABLED=true
INTAKE_MOBILE_API_ONLY=true   # optional: block non-mobile clients
```

Register a mobile-tier key:

```json
[
  {
    "key": "sk_mobile_prod",
    "partnerId": "needfinder-mobile",
    "tier": "mobile",
    "ownerUserId": "<service-user-uuid>",
    "label": "iOS/Android app"
  }
]
```

## Required headers

```
X-Intake-Api-Key: sk_mobile_prod
X-Intake-Client: mobile
X-NeedDraft-Schema-Version: 2
```

## Flow

1. **Analyze** (optional) ? existing `/api/need-intake/analyze` or queue endpoint from Phase 46
2. **Create draft** ? `POST /api/v1/intake/drafts`
3. **Update** ? `PUT /api/v1/intake/drafts/:id` as user fills wizard screens natively
4. **Publish** ? `POST /api/v1/intake/drafts/:id/publish`

## Rate limit

Mobile tier default: **120 requests/hour** (`INTAKE_PUBLIC_API_RATE_MOBILE_PER_HOUR`).

## API-only mode

When `INTAKE_MOBILE_API_ONLY=true`:

- Partner-tier keys without `X-Intake-Client: mobile` receive `403`
- Web scrapers cannot reuse partner keys for bulk posting

## Parity

Mobile native UI must collect the same publish-required fields as the web wizard. Use `validatePublishRequest` errors from publish endpoint (`422`) to drive inline validation.
