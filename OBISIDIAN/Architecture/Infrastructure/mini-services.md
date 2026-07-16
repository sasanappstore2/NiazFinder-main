---
title: "Architecture: Mini-Services"
tags: [architecture, infrastructure]
status: live
---

# Mini-Services — Live vs Dead

## هدف
روشن کردن این‌که کدام سرویس در `mini-services/` واقعاً در تولید/توسعه فعال است، تا زمان روی کد مرده تلف نشود.

## جدول وضعیت

| سرویس | زبان | Docker profile | وضعیت |
|-------|------|-----------------|-------|
| `worker-go/` | Go | `default` | **زنده** — پردازشگرهای صف (`intake_processor.go`, `analytics_processor.go`) |
| `chat-service/` | Bun/TS (Socket.io) | `default` | **زنده** — SoT چت realtime (`npm run dev:chat`) |
| `chat-go/` | Go | نامشخص | ⚠️ **وضعیت تأیید‌نشده** — نسخهٔ موازی چت؛ آیا جایگزین در حال گذار است یا آزمایشی؟ نیاز به تأیید تیم |
| `gemma4-intake/` | Python/FastAPI | `ai` | زنده، اختیاری — inference محلی LLM برای intake |
| `embed-intake/` | Python/FastAPI | `ai` | زنده، اختیاری — تولید embedding |
| `estate-scrape/` | Python | نامشخص | اسکریپر real-estate — profile دقیق تأیید‌نشده |
| `backend/` (NestJS) | TypeScript | `legacy` | **عمدتاً مرده** — به جز ۳ ماژول: `intake-typing/`, `intake-queue/`, `intake-intelligence/` که هنوز توسط `/post` استفاده می‌شوند |

## ماژول‌های NestJS legacy (غیر بارگذاری‌شده، صرفاً مرجع تاریخی)
admin, auth, bookmarks, categories, chat, dashboard, events, health, internal, notifications, proposals, referrals, reports, requests, reviews, search, smart-matching, specialists, users, voice, wallet — ۲۱ ماژول. `ai-agent` قبلاً همین‌جا بود و در ۲۰۲۶-۰۷-۱۶ کامل حذف شد.

## روابط
- سه ماژول زنده در ارتباط با: [[../Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
- چت: [[../Backend/chat-communication|Architecture/Backend/chat-communication]]
- اجرا: `docker compose up -d` (پیش‌فرض) + `docker compose --profile ai up -d` (AI sidecars)
