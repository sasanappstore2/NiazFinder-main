# API Reference

> Version `0.2.x-unstable` — the surface is still evolving. Only operations with
> explicit request/response schemas below (and in `openapi.json`) should be
> treated as remotely stable.

Machine-readable contract: [`openapi.json`](openapi.json) (OpenAPI 3.1,
generated — 248 paths / 325 operations). Regenerate after route changes:

```bash
npm run docs:openapi
```

The generator (`scripts/openapi/generate-openapi.ts`) detects HTTP methods and
auth requirements statically; hand-verified shapes live in
`scripts/openapi/enrichments.json`.

## Auth conventions

| Surface | Mechanism |
|---|---|
| User routes | `Authorization: Bearer <token>` (phone-OTP login via `POST /api/auth/verify`); elevated ops need `ADMIN`/`SUPER_ADMIN` |
| Worker/cron routes (`/api/internal/*`) | `x-internal-secret: <INTERNAL_API_SECRET>` — constant-time compare, fail-closed (`503`/`403`) |
| Chat fan-out (`POST /internal/fanout`) | Same internal secret |

## Documented operations (hand-verified)

- `POST /api/auth/verify` — `{phone, code, intent?}` → user + Bearer token. Rate-limited per IP and per phone.
- `POST /api/intake/analyze` — `{text, draftRevision?, citySlug?, cityName?, formHints?, forceAi?}` → structured intake result. 96KB cap.
- `POST /api/post/natural-analyze` — `{sourceText, …locks/hints}` → fields + provisional category (contract v2). Si auto-apply off by default.
- `POST /api/need-intake/publish` — authenticated, `{draft, listingPreview?, idempotencyKey?}` → published need.

All other paths in `openapi.json` carry only detected methods/auth plus a
stability warning — schemas are added progressively in `enrichments.json`.
