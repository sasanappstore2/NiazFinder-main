---
title: "Coding Standards"
tags: [ai]
status: live
---

# Coding Standards

## قراردادهای پروژه (از CLAUDE.md)
- Import alias: `@/*` → `src/*`
- `mini-services/`, `examples/`, `**/fixtures/**` از `tsconfig.json` ریشه مستثنی‌اند
- محصول RTL فارسی است: متن UI فارسی، کد/شناسه‌ها/پیام کامیت انگلیسی
- تایل‌های نقشه محلی سرو می‌شوند از `/api/map/*`

## قراردادهای مشاهده‌شده در این جلسه
- **توکن‌های طراحی معنایی** (`--primary`, `--card`, `--muted`, `--border`, `--destructive` در `globals.css`) به‌جای رنگ خام Tailwind (`emerald-500`) — کامپوننت‌های جدید/پرداخت‌شده از این الگو پیروی می‌کنند.
- **الگوی empty-state**: آیکون در کاشی نرم (`bg-muted rounded-2xl`) + عنوان + توضیح + دکمهٔ CTA.
- **الگوی env accessor**: یک تابع typed به‌ازای هر متغیر، با `parseInt`/`Number.isFinite` fallback — نه خواندن مستقیم `process.env` در call site (مرجع: `src/lib/smart-matching/env.ts`, `src/lib/payment/env.ts`).
- **shadcn/ui `Card`** یک `<div>` ساده است، `asChild`/Slot پشتیبانی نمی‌شود — برای لینک‌شدنی‌کردن، عنصر دیگری استفاده کنید نه `Card asChild`.

## تست
- `npm run check:all` گیت کامل محلی (prisma validate → tsc → eslint → build → ~۲۰ suite زنجیره‌ای)
- `npm run lint` (`eslint src`)

## روابط
- [[Architectural_Principles|Architectural_Principles.md]]
- [[../Testing/README|Testing/]]
