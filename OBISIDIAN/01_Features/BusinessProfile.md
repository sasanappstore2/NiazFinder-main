---
title: Business Profile
tags: [feature, business]
---

# Business Profile System

پروفایل کسب‌وکار، offers، portfolio، SEO slug `/b/{slug}`.

## Docs

- [docs/BUSINESS_PROFILE_SYSTEM.md](../../docs/BUSINESS_PROFILE_SYSTEM.md) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/docs/BUSINESS_PROFILE_SYSTEM.md)

## UI

- Public: `src/app/(main)/b/[slug]/`
- Edit: [pro edit page](../../src/app/%28main%29/pro/%5Bid%5D/edit/page.tsx)
- Components: [src/components/business-profile/](../../src/components/business-profile/)

## API

- `GET/PATCH /api/business/me` — [business/me/route.ts](../../src/app/api/business/me/route.ts)
- Offers, portfolio, layout, extensions under `business/me/**`

## Domain

- [src/lib/business/](../../src/lib/business/)

## Related

- [[MarketplaceBrowse]]
- [[LeadOutreach]]
