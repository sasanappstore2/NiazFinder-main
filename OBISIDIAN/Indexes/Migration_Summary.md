---
title: "Migration Summary"
tags: [index]
status: live
---

# Migration Summary

## آمار
| | تعداد |
|---|---|
| فایل md قبل از این کار | ۶۵ (شامل ۲ فایل خالی زباله) |
| فایل md بعد از این کار | ۱۳۱ |
| فایل حذف‌شده | ۲ (`2026-05-27.md`, `Untitled.md` — خالی) |
| فایل جدید | ۶۸ |
| فایل merge/تغییریافته | ~۲۰ |

## چه چیزی move شد
هیچ‌کدام از پوشه‌های substantive موجود (`10_Product_Areas/`, `90_Technical_Appendix/`, `00_Product_MOC/`, `03_Operations_Debug/`) move نشدند — طبق تصمیم صریح پلن، برای جلوگیری از شکستن ~۳۰۲ لینک داخلی موجود.

## چه چیزی merge شد
۶ فایل `01_Features/*.md` (Chat, AdminModeration, NeedIntake, BusinessProfile, TypingAnalysisRealtime, LeadOutreach, MarketplaceBrowse) محتوای واقعی‌شان به فایل متناظر در `10_Product_Areas/` منتقل شد (بخش «پیاده‌سازی فنی»)، سپس خودشان به stub redirect تبدیل شدند — تکمیل مهاجرتی که قبلاً نیمه‌کاره رها شده بود.

## چه چیزی حذف شد
- `2026-05-27.md`, `Untitled.md` — هر دو کاملاً خالی.

## چه چیزی fix شد
- لینک شکسته در `90_Technical_Appendix/Index/Architecture.md` (مسیر غلط SocketServices)
- لینک‌های stale به `01_Features/` در `SocketServices.md`, `E2EChecklist.md`, `DocsHub.md` retarget شدند به `10_Product_Areas/`
- ردیف گم‌شدهٔ `17_Monetization_Backlog` در جدول `ProductMap.md` اضافه شد

## چه چیزی جدید ساخته شد
۱۸ پوشهٔ سطح‌بالای جدید (`Architecture/`, `AI/`, `ADR/`, `RFC/`, `Playbooks/`, `Runbooks/`, `Debug/`, `Testing/`, `Product/`, `Roadmap/`, `Glossary/`, `Decision Logs/`, `Business Logic/`, `Features/`, `API/`, `Security/`, `Performance/`, `Research/`) — هرکدام با `README.md` hub. ۱۹ سند معماری ماژول با Mermaid diagram. ۱۱ ADR (۶ خلاصه‌شده از `docs/adr/` + ۵ جدید). ۴ RFC (۲ خلاصه‌شده از `docs/rfc/` + ۲ جدید). ۱۰ سند در `AI/` برای حافظهٔ ایجنت‌های آینده. ۵ چک‌لیست عملیاتی + Tag Taxonomy.

## چه چیزی عمداً دست‌نخورده ماند
- `docs/` (۱۳۷ فایل) — فقط لینک خورد، بازنویسی نشد.
- کد سورس — هیچ‌جا کپی نشد، فقط مسیر فایل لینک شد.
- تناقض شماره‌گذاری دوگانهٔ ADR-004 در `docs/adr/` — خارج از scope، فقط در `ADR/README.md` یادداشت شد.

## ریسک‌های flag‌شده (نه حل‌شده)
- وضعیت `chat-go` در برابر `chat-service` — [[../ADR/010-websocket-realtime-strategy|ADR-010]] proposed مانده، نیاز به تصمیم تیم.
- `src/components/need-intake.backup.20260711/` — منشأ/ضرورت نگهداری تأیید‌نشده.
