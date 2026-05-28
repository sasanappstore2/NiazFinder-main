---
title: Lead Outreach
tags: [feature, leads]
---

# Lead Outreach (AI matching)

ارسال lead به کسب‌وکارهای مرتبط پس از publish نیاز.

## Docs

- [docs/AI_LEAD_OUTREACH.md](../../docs/AI_LEAD_OUTREACH.md)
- [docs/HOME_LEAD.md](../../docs/HOME_LEAD.md)
- [docs/NEED_MATCH.md](../../docs/NEED_MATCH.md)

## Config

- [.env.example](../../.env.example) — `LEAD_*` vars
- [src/lib/need-leads/env.ts](../../src/lib/need-leads/env.ts)

## API

- [admin/need-leads/dispatch/route.ts](../../src/app/api/admin/need-leads/dispatch/route.ts)
- [business/leads/route.ts](../../src/app/api/business/leads/route.ts)

## Prisma

- `NeedLeadOutreach` model in [schema.prisma](../../prisma/schema.prisma)

## Related

- [[NeedIntake]]
- [[BusinessProfile]]
