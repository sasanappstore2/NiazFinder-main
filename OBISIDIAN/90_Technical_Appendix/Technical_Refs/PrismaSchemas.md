---
title: Prisma & Database
tags: [technical, database, prisma]
---

# Prisma schemas

## Root app (primary for Next)

| Item | Path |
|------|------|
| Schema | [prisma/schema.prisma](../../prisma/schema.prisma) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/prisma/schema.prisma) |
| Migrations | [prisma/migrations/](../../prisma/migrations/) |
| Client | [src/lib/db.ts](../../src/lib/db.ts) |

- Provider: **sqlite** via `DATABASE_URL`
- Models: User, ServiceRequest, BusinessProfile, Chat, Wallet, Staff RBAC, NeedLeadOutreach, …

## Mini-services

| Service | Schema |
|---------|--------|
| Backend (compat) | [mini-services/backend/prisma/schema.prisma](../../mini-services/backend/prisma/schema.prisma) |
| Chat service | [mini-services/chat-service/prisma/schema.prisma](../../mini-services/chat-service/prisma/schema.prisma) |

## Nest TypeORM (Postgres in prod)

- [database.module.ts](../../mini-services/backend/src/database/database.module.ts) — Postgres + `DATABASE_*` env

## Commands

```bash
npx prisma migrate status
npx prisma migrate dev
npx prisma db push
npm run db:generate
```

## Related

- [[../00_Index/EnvMap|EnvMap]]
- [[../03_Operations_Debug/DebugPlaybook|DebugPlaybook]]
