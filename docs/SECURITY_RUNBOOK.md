# Security Runbook — نیاز فایندر

## Required production environment variables

| Variable | Purpose | If missing |
|----------|---------|------------|
| `INTERNAL_API_SECRET` | Protects `/api/internal/*` and chat-service `/internal/fanout` | Internal moderation returns **503**; fanout rejected |
| `CHAT_INTERNAL_SECRET` | Same value as above for chat-service HTTP fanout | Fanout returns **401** |
| `SUPER_ADMIN_PHONES` | Comma-separated E.164/normalized phones allowed super-admin | Falls back to env `SUPER_ADMIN_PHONE` only |
| `POSTGRES_PASSWORD` | DB password | Must not use `change_me` in prod |
| `REDIS_PASSWORD` | Redis auth (recommended prod) | Redis exposed if port published |
| `MINIO_ROOT_PASSWORD` | Object storage | Must not use default `minioadmin` |
| `TURN_SECRET` | WebRTC TURN credentials | Voice calls fail NAT traversal |
| `ALLOW_TEST_OTP` | Set `true` only in dev/staging to allow test OTP | Test OTP blocked in production |

## Secret rotation

1. Generate new secret: `openssl rand -hex 32`
2. Update `INTERNAL_API_SECRET` / `CHAT_INTERNAL_SECRET` on Next.js and chat-service simultaneously
3. Redeploy both services before revoking old value
4. Rotate `TURN_SECRET` → restart coturn; clients fetch new credentials on next call

## Incident response (short)

1. **Suspected token leak** — revoke via DB (`AuthToken` delete for user), force re-login
2. **Fanout abuse** — verify `CHAT_INTERNAL_SECRET`, block source IP at Caddy/reverse proxy
3. **Socket impersonation** — ensure chat-service has no `userId`-only auth; restart chat-service
4. **IDOR report** — identify route, add participant/owner check, run `scripts/security-smoke.ts`

## Regression checklist (manual, each security PR)

- [ ] OTP login / logout / token expiry
- [ ] ثبت نیاز + browse + proposal
- [ ] پروفایل کسب‌وکار + upload تصویر
- [ ] چت: send, reply, react, pin, delete
- [ ] تماس صوتی (۲ client)
- [ ] super-admin panel (staff vs non-staff)
- [ ] Public pages بدون auth

Automated:

```bash
npm run security:inventory
npm run test:security-smoke
npm run test:communication-e2e
npx tsc --noEmit
```


## Docker production notes

- Do **not** publish Postgres (`5432`), Redis (`6379`), or MinIO console to the public internet
- Use internal Docker network; only Caddy exposes 80/443
- Set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MINIO_ROOT_PASSWORD` in `.env` (never commit)
