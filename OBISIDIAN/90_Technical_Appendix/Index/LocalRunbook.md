---
title: Local Dev Runbook
tags: [index, runbook]
---

# Local development

## مستند کامل

- [docs/LOCAL_DEV_RUNBOOK.md](../../docs/LOCAL_DEV_RUNBOOK.md) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/docs/LOCAL_DEV_RUNBOOK.md)
- Deploy (Docker): [DEPLOY.md](../../DEPLOY.md)

## دستورات (از ریشهٔ ریپو)

```bash
npm install

# ترمینال ۱ — Nest
npm run dev:backend    # :4000

# ترمینال ۲ — Chat (اختیاری؛ اگر Nest chat gateway کافی نیست)
npm run dev:chat       # :3004

# ترمینال ۳ — Next
npm run dev            # :3000
```

## تست سریع

```bash
npm run smoke:routes
npm run smoke:api
npm run test:intake-parser
npm run test:intake-flow
npm run test:typing-analysis
```

## پورت‌ها

| Service | Port |
|---------|------|
| Next.js | 3000 |
| Nest | 4000 |
| Chat (standalone) | 3004 |
| Redis (docker) | 6379 |
| Postgres (docker) | 5432 |

## Related

- [[EnvMap]]
- [[../03_Operations_Debug/DebugPlaybook|DebugPlaybook]]
- [[../03_Operations_Debug/HealthScripts|HealthScripts]]
