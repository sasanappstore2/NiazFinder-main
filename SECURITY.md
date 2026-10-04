# Security Policy

## Supported Versions

NiazFinder is under active development (currently `0.2.x`, unreleased). Only the latest `main` branch receives security fixes. There are no maintained release lines yet.

## Reporting a Vulnerability

**Do not open a public GitHub issue for a suspected vulnerability.**

Instead, report it privately to the maintainer with:

- A description of the issue and the affected area (endpoint, file, or commit)
- Steps to reproduce (without attacking production systems or other users' data)
- Any relevant logs, redacted of secrets and personal data

The maintainer will acknowledge receipt, investigate, and coordinate a fix and disclosure timeline with you. Credit will be given if desired.

## Security Boundaries (as implemented)

- **Auth:** phone-OTP + sessions; server-side tokens with expiry (`AuthToken`). Test OTP (`ALLOW_TEST_OTP`) is hard-gated to non-production — it must never be enabled in production.
- **Internal routes** (`/api/internal/*`, chat `/internal/fanout`): guarded by `INTERNAL_API_SECRET` with constant-time comparison; fail closed (`503` unconfigured, `403` mismatch).
- **AI sidecars** (laya-post, gemma4-intake, embed-intake): loopback-only, proxied through Next.js server routes, never directly browser-reachable. Research adapters require explicit manifest + checksum gates and are experiment-only.
- **Secrets:** environment variables only. `.env.example` holds placeholders; real values must never be committed.

## Known Exposure (action required by maintainer)

Tracked `.env`, `.env.local`, and `.env.backup` files were previously committed to git history containing real-looking values (`INTERNAL_API_SECRET`, `JWT_SECRET`, `GEMINI_API_KEY`, `TYPESENSE_API_KEY`). These files have been untracked, but **history still contains them**. The maintainer should:

1. Rotate every secret that ever appeared in a committed env file.
2. Consider rewriting history (`git filter-repo`) or, if the repo is freshly published, publishing from a clean history.
3. Verify no other secrets exist in history: `git log -p -- .env* | grep -E 'SECRET|KEY|PASSWORD|TOKEN'`.

Rotation checklist (tick off as each is replaced in every environment):

- [ ] `INTERNAL_API_SECRET` / `CHAT_INTERNAL_SECRET`
- [ ] `JWT_SECRET`
- [ ] `GEMINI_API_KEY`
- [ ] `TYPESENSE_API_KEY`
- [ ] `POSTGRES_PASSWORD` (+ `DATABASE_URL` credentials)
- [ ] `RABBITMQ_USER` / `RABBITMQ_PASSWORD`
- [ ] `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- [ ] `SMART_MATCHING_INTERNAL_SECRET`
- [ ] `ZARINPAL_MERCHANT_ID` (if a real merchant id was ever committed)

See also [`docs/PROD_CHECKLIST.md`](../docs/PROD_CHECKLIST.md) for the full pre-production review.

## Out of Scope (current posture, not guarantees)

No formal security audit, penetration test, or SOC/ISO certification has been performed. Rate limits, CORS lockdown (`CHAT_CORS_ORIGINS`), and upload restrictions are configured per-environment — review them before any production deployment.

## Dependency Advisories (audited 2026-10-04, `npm audit --omit=dev`)

Patched within the same major (see `package.json` + `overrides`): Next.js → 16.3.x,
axios → 1.20.x, next-auth → 4.24.15 line, sharp → 0.35.x, Prisma → 6.19.x,
tailwindcss / socket.io-client latest 4.x; transitive `ws`, `socket.io-parser`,
`js-yaml`, `nanoid` pinned via npm `overrides`. The `dependency-audit` CI job
is advisory (`continue-on-error`) until the items below are resolved.

Known remaining, requiring upstream or major upgrades — do NOT blindly upgrade:

| Package | Issue | Why not yet fixed |
|---|---|---|
| `maplibre-gl` 5.x | Critical XSS sanitizer bypass (GHSA-jrc7-96c5-q579) | Fix requires major upgrade to 6.x (breaking map API). Reachability checked 2026-10-04: no `setHTML`/Mapbox-popup or `dangerouslySetInnerHTML` usage in map components — popups render through React. Re-check on any map UI change. |
| `@prisma/config` → `deepmerge-ts` | High stack-exhaustion on recursive merge graphs | Pinned by Prisma 6.19.x itself; fix must come from Prisma upstream. Not reachable from request handling in normal use. |
