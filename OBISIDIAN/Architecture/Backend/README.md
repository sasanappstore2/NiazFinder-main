---
title: "معماری Backend"
tags: [architecture, backend]
status: live
---

# معماری Backend

## هدف
مستندسازی دامنه‌های بزرگ `src/lib/` و `src/intake/` — منطق سمت سرور که پشت ۲۱۶ روت API قرار دارد.

## اسناد
| سند | دامنه |
|-----|-------|
| [[need-intake-engine\|need-intake-engine.md]] | `src/intake/` — موتور تحلیل نیاز (۳۱ زیرپوشه) |
| [[smart-matching\|smart-matching.md]] | `src/lib/smart-matching/` — تطبیق نیاز↔کسب‌وکار، ارسال لید VIP |
| [[wallet-payments\|wallet-payments.md]] | `src/lib/payment/`, `src/lib/wallet/`, `src/lib/referral/` — کیف پول، درگاه، اشتراک، رفرال |
| [[business-profile\|business-profile.md]] | `src/lib/business/` |
| [[chat-communication\|chat-communication.md]] | `src/lib/chat/`, `mini-services/chat-service/` |
| [[search\|search.md]] | `src/lib/search/` (Typesense) |
| [[rbac-auth\|rbac-auth.md]] | `src/lib/auth/`, `src/lib/rbac/` |
| [[geo-map\|geo-map.md]] | `src/lib/geo/`, `src/lib/map/`, `src/lib/neighborhoods/` |

## روابط
- تمام این ماژول‌ها زیر `src/app/api/**` مصرف می‌شوند — نقشهٔ کامل route ها در [[../../API/README|API/]].
- برای «چرا» هر دامنه به‌جای «چطور»، به [[../../10_Product_Areas/|10_Product_Areas]] مراجعه کنید.

## ترتیب خواندن
اگر تازه‌کارید: `need-intake-engine` (بزرگ‌ترین و مرکزی‌ترین دامنه) → `smart-matching` → `wallet-payments`.
