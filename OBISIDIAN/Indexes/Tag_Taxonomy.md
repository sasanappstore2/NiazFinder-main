---
title: "Tag Taxonomy — تگ‌های مصوب"
tags: [index]
status: live
---

# Tag Taxonomy

## هدف
جلوگیری از تگ‌انفجار (tag explosion) — یک تگ برای یک بعد، بدون تکرار مترادف.

## تگ‌های مصوب

| تگ | استفاده |
|-----|---------|
| `#architecture` | اسناد `Architecture/` و ADR های معماری |
| `#backend` | دامنه‌های `src/lib/` سمت سرور |
| `#frontend` | `src/components/`, `src/app/` |
| `#database` | Prisma/schema |
| `#api` | نقشهٔ روت‌ها |
| `#security` | امنیت، RBAC، auth |
| `#performance` | کارایی |
| `#ai` | هر چهار سیستم AI |
| `#feature` | اسناد فیچر محصول (`10_Product_Areas/`) |
| `#bug` | یافته‌های باگ مستندشده |
| `#decision` | ADR و Decision Log |
| `#research` | یافته‌های تحقیقی |
| `#marketplace` | بازار نیاز/کسب‌وکار |
| `#business` | منطق کسب‌وکاری/wallet |
| `#chat` | ارتباطات |
| `#operations` | Playbook/Runbook |
| `#index` | فایل‌های hub/INDEX |
| `#adr` | مشخصاً ADR (علاوه بر `#decision`) |
| `#rfc` | پیشنهادهای سیستم بزرگ |
| `#product-moc` / `#product-area` | لایهٔ قدیمی محصول (دست‌نخورده، تگ‌های موجود حفظ شدند) |

## قانون
- حداکثر ۳-۴ تگ به‌ازای فایل.
- تگ جدید فقط وقتی اضافه می‌شود که هیچ‌کدام از تگ‌های بالا آن بعد را پوشش ندهند.
- تگ‌های تک‌مصرفی قدیمی (`typing`, `health`, `graph`, `catalogue`) عمداً merge نشدند تا فایل‌های موجود دست‌نخورده بمانند — فقط برای فایل جدید استفاده نشوند.

## روابط
- [[../Glossary/README|Glossary/]]
