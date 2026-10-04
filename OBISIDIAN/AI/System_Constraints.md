---
title: "System Constraints"
tags: [ai]
status: live
---

# System Constraints

محدودیت‌های فنی/کسب‌وکاری که باید در هر تصمیم لحاظ شوند.

## فنی
- **Bun runtime** — نه Node.js خالص؛ برخی رفتارها (مثل تفاوت در ماژول resolution) می‌تواند متفاوت باشد.
- **Next.js 16 App Router** — frontend و backend در یک اپ؛ روت‌های API زیر `src/app/api/**` هستند، نه یک سرویس جدا (به‌جز مینی‌سرویس‌ها).
- **PostgreSQL + pgvector** — DB نام `needfinder`؛ برخی اسناد قدیمی به sqlite اشاره می‌کنند که **اشتباه/منسوخ** است.
- **migration drift** بین `prisma/migrations/` و دیتابیس dev محلی — یک واقعیت شناخته‌شده، نه فرضی.
- **Turbopack cache** می‌تواند بعد از تغییرات بزرگ خراب بماند — فقط حذف کامل `.next` قابل‌اعتماد است.

## زیرساخت/محیط
- `docker compose up -d` استک پیش‌فرض (postgres, redis, minio, typesense, rabbitmq, worker-go, chat) — AI sidecar ها جدا (`--profile ai`).
- Intake پیش‌فرض rules-only است؛ LLM محلی opt-in.
- تایل‌های نقشه محلی سرو می‌شوند، نه مستقیم از Mapbox.

## کسب‌وکاری
- بازار هدف ایران — احراز هویت تلفن-محور، نه ایمیل.
- پرداخت‌ها به تومان (نه ریال) در تمام کد جدید مدل درآمدی محاسبه می‌شوند.
- Zarinpal (درگاه) در sandbox تا زمانی که merchant ID واقعی تنظیم شود.

## روابط
- [[Engineering_Constitution|Engineering_Constitution.md]]
- [[../Debug/README|Debug/]] برای دام‌های عملیاتی شناخته‌شده
