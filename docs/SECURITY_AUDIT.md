# Security Audit Matrix — نیاز فایندر

> Last updated: 2026-06-03. Track status: **open** | **fixed** | **accepted** | **wontfix**

## Baseline (Phase 0)

| Metric | Value |
|--------|-------|
| API routes | 174 |
| Auth: none | 15 |
| Auth: user | 58 |
| Auth: RBAC | 80 |
| Auth: secret | 1 |
| Auth: unknown (review) | 20 |
| npm audit (moderate+) | 8 |

Run inventory: `npx tsx scripts/security-route-inventory.ts`

## Findings

| ID | Sev | Area | Description | Status | Files / PR |
|----|-----|------|-------------|--------|------------|
| SEC-001 | P0 | Socket | Auth via raw `userId` without token | **fixed** | `mini-services/chat-service/lib/auth.ts` |
| SEC-002 | P0 | Socket | `connectionStateRecovery.skipMiddlewares` bypassed auth | **fixed** | `mini-services/chat-service/index.ts` |
| SEC-003 | P0 | Fanout | `/internal/fanout` open, unbounded body | **fixed** | chat-service + `redis-publish.ts` |
| SEC-004 | P0 | Internal API | `INTERNAL_API_SECRET` optional → auto-approve | **fixed** | `internal/request-moderation/route.ts` |
| SEC-005 | P0 | Infra | Postgres/Redis/MinIO on host without password | **fixed** | `docker-compose.yml` (localhost bind) |
| SEC-006 | P0 | Auth | Super-admin phone hardcoded | **fixed** | `src/lib/super-admin.ts` → `SUPER_ADMIN_PHONES` |
| SEC-101 | P1 | Password | SHA256 + static salt | **fixed** | `src/lib/auth/password.ts` (scrypt + legacy) |
| SEC-102 | P1 | OTP | In-memory OTP store | **fixed** | `src/lib/otp-store.ts` (Redis + fallback) |
| SEC-103 | P1 | Auth | Phone enumeration via check-phone | **fixed** | `auth/check-phone/route.ts` |
| SEC-104 | P1 | Auth | Test OTP `1234` in non-prod only | **fixed** | `src/lib/auth/test-otp.ts` |
| SEC-105 | P1 | Auth | verify/login rate limits | **fixed** | `src/lib/security/rate-limit.ts` |
| SEC-201 | P2 | Upload | MIME-only validation | **fixed** | `src/lib/security/file-magic.ts` |
| SEC-202 | P2 | Headers | Missing security headers | **fixed** | `next.config.ts` |
| SEC-301 | P3 | Polling | Chat/typing/calls poll when socket up | **fixed** | polling hooks + typing throttle |
| SEC-302 | P3 | Redis | New connection per typing request | **fixed** | `typing-state.ts` pool |
| SEC-303 | P3 | Chat-svc | Unbounded conversationCache | **fixed** | LRU in chat-service |
| SEC-401 | P1 | WebRTC | call:accept/ice without participant check | **fixed** | chat-service call handlers |
| SEC-402 | P2 | WebRTC | TURN secret env | **fixed** | `config/turnserver.conf` + docs |

## Unknown routes (manual review)

Run `npx tsx scripts/security-route-inventory.ts` and audit any route marked `unknown`.

## Regression

See `docs/SECURITY_RUNBOOK.md` and `scripts/security-smoke.ts`.
