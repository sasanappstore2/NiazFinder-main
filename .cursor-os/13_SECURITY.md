# 13 — Security

## Current truth (high level)

- Auth & sessions live in Next app libs (`src/lib/auth*`, tokens in Prisma)
- RBAC / staff permissions in `src/lib/rbac/` and staff models
- Super-admin allowlists via env (`SUPER_ADMIN_PHONES` etc. — see `.env.example`)
- Internal service secrets: `INTERNAL_API_SECRET`, `CHAT_INTERNAL_SECRET`
- Security smoke: `npm run test:security-smoke`

This file is operational guidance — not a full threat model.

---

## Secrets handling

| Do | Don't |
|----|-------|
| Use `.env.local` locally | Commit `.env.local` / real keys |
| Reference `.env.example` names | Paste production secrets into OS memory |
| Rotate when leaked | Log tokens in telemetry |

Agent rule: if a diff includes secrets, strip and warn.

---

## API hygiene

- Validate inputs (Zod commonly used)
- Authorization on business/me, chat, wallet, admin routes
- Do not trust client `NEXT_PUBLIC_*` for security decisions
- Rate limits: respect existing intake rate limit; test bypasses only via explicit env flags

---

## Chat security

- Socket URL public; **auth handshake + internal secret** for server-to-server
- Disable socket in dev if unset/off
- Attachment MIME allowlists — see smoke tests
- Block list model `UserBlock`

---

## Wallet / leads

- Lead fees debit wallet — treat as money movement
- No client-side fee forgery; server env + helpers authoritative
- Audit admin moderation of businesses (Typesense sync on status change)

---

## Data / PII

- Persian needs may contain phone numbers/addresses — minimize retention in logs
- Legal connectors must not warehouse scraped PII without policy
- Reports / disputes: staff-only access paths

---

## LLM security

- User text is untrusted input
- Prefer local gateway; do not exfiltrate prompts to unknown cloud endpoints when `LOCAL_LLM_ONLY`
- No tool-execution from model output without allowlisted server tools

---

## Admin

- Staff roles/permissions tables
- Audit logs for sensitive actions
- Super-admin ≠ normal business user

---

## Checklist for security-sensitive PRs

- [ ] AuthZ on new routes
- [ ] No secret in client bundle
- [ ] Tests/smokes updated
- [ ] Threat notes for money/PII paths
- [ ] ADR if auth model changes
