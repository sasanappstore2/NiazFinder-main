---
title: Next.js App Entry Points
tags: [technical, nextjs]
---

# Next.js App Router

## Root

| File | Role |
|------|------|
| [layout.tsx](../../src/app/layout.tsx) | Root layout, SEO, theme |
| [page.tsx](../../src/app/page.tsx) | Home (`HomeLeadLanding`) |
| [middleware.ts](../../src/middleware.ts) | Canonical marketplace URLs |

## Route groups

| Group | Path | Purpose |
|-------|------|---------|
| `(main)` | `src/app/(main)/` · [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/app/%28main%29) | Public app shell |
| `(auth)` | `src/app/(auth)/` · [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/app/%28auth%29) | login, register |
| `(chat)` | `src/app/(chat)/` · [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/app/%28chat%29) | Chat UI |
| `(admin)` | `src/app/(admin)/` · [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/app/%28admin%29) | Super-admin |

## Pages catalogue

→ [[PagesCatalogue]]

## API

→ [[../00_Index/APIRoutesCatalogue|APIRoutesCatalogue]]

## Config

| File | Role |
|------|------|
| [next.config.ts](../../next.config.ts) | Standalone output, redirects |
| [src/config/routes.ts](../../src/config/routes.ts) | `routeBuilder` helpers |

## Related

- [[../00_Index/Architecture|Architecture]]
- [[MarketplaceBrowse]]
