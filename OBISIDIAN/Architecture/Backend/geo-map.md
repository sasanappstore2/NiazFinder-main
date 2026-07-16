---
title: "Architecture: Geo & Map"
tags: [architecture, backend]
status: live
---

# Geo & Map (`src/lib/geo/`, `src/lib/map/`, `src/lib/neighborhoods/`)

## هدف
داده و رندر نقشهٔ ایران/مشهد، تشخیص محله/منطقه، geometry شهر/استان.

## زیرسیستم‌ها
| زیرپوشه | نقش | حجم |
|---------|-----|-----|
| `map/` | رندر تایل برداری/راستری، glyph، کش | ۴۵ فایل |
| `neighborhoods/` | داده/مرز محله | ۱۷ فایل |
| `geo/` | geometry province/city | ۶ فایل |

## سرو تایل
تایل‌های نقشهٔ ایران **محلی** سرو می‌شوند از `/api/map/*` (نه مستقیم از Mapbox) — طبق CLAUDE.md.

## اسکریپت‌های مرتبط
`geo:import`, `geo:build`, `geo:quality-check`, `geo:gate-province[-all]`, `map:prewarm-iran/mashhad`, `neighborhoods:import*`, `neighborhoods:rebuild-deep`.

## روابط
- Grounding مکان برای intake: [[../AI/rag-grounding|Architecture/AI/rag-grounding]]
- محصول: [[../../10_Product_Areas/03_Need_Marketplace|10_Product_Areas/03_Need_Marketplace]]

## منابع کامل (docs/)
- [docs/LOCATION_AUTO.md](../../../docs/LOCATION_AUTO.md), [docs/NEIGHBORHOOD_FILTERS.md](../../../docs/NEIGHBORHOOD_FILTERS.md)
