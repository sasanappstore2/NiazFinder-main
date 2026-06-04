# Incident Response Runbook — نیاز فایندر

## Severity

| Level | Examples | Response |
|-------|----------|----------|
| SEV-1 | Auth bypass, data leak, payment fraud | Page on-call, freeze deploys |
| SEV-2 | Chat down, OTP flood, mass 500s | Mitigate within 1h |
| SEV-3 | Degraded search, stale sitemap | Next business day |

## First 15 minutes

1. Confirm scope (which routes, % users, regions).
2. Check `docker compose ps`, Postgres, Redis, chat-service (port 3004).
3. Run `npm run test:security-smoke` and `npm run security:inventory`.
4. Capture logs: `dev.log`, chat-service stdout, `AdminAuditLog` / `StaffAuditLog`.

## Common playbooks

### Suspected credential leak

- Rotate `INTERNAL_API_SECRET`, `CHAT_INTERNAL_SECRET`, TURN secret.
- `POST /api/auth/sessions/revoke` for affected accounts (or bulk revoke tokens in DB).
- Force password reset for email users.

### Chat / socket outage

- Verify `REDIS_URL` and chat-service health.
- Fallback: REST message send still works; polling disabled when socket healthy.
- Redis channel: `comm:events` — confirm publisher in Next.js.

### OTP abuse

- Rate limits: `verify:ip`, `verify:phone` in `src/lib/security/rate-limit.ts`.
- Disable test OTP: `ALLOW_TEST_OTP=false` in production.

## Post-incident

- Entry in `docs/SECURITY_AUDIT.md` findings table.
- `StaffAuditLog` review for actor + action trail.
