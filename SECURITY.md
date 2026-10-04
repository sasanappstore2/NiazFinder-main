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

## Out of Scope (current posture, not guarantees)

No formal security audit, penetration test, or SOC/ISO certification has been performed. Rate limits, CORS lockdown (`CHAT_CORS_ORIGINS`), and upload restrictions are configured per-environment — review them before any production deployment.
