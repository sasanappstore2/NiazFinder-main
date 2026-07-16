---
title: "Testing"
tags: [testing]
status: live
---

# Testing

## هدف
نقشهٔ خوشه‌های عظیم اسکریپت تست پروژه (۳۳۶+ اسکریپت npm) — تا مشخص شود کدام دامنه واقعاً تست‌محور توسعه داده می‌شود.

## خوشه‌های اصلی (از `package.json`)
| خوشه | حجم | نمونه |
|------|-----|-------|
| Intake (بزرگ‌ترین) | ~۱۲۰+ اسکریپت | `test:intake-*`, `test:post-*`, `rules:generate`, marathon/stress loops مثل `stress/run-intake-human-marathon-10k.ts` |
| AI/LLM infra | چند اسکریپت | `smoke:local-llm-intake`, `smoke:gemma4-intake`, `verify:gemini` |
| Geo/Map | چند اسکریپت | `geo:import`, `geo:quality-check`, `map:verify-cache` |
| Neighborhoods | چند اسکریپت | `neighborhoods:import*`, `neighborhoods:rebuild-deep` |
| دامنه‌ای e2e/smoke | یک به یک | `test:wallet-api`, `test:super-admin-e2e`, `test:voice-call-e2e`, `test:business-onboarding`, `test:dashboard-api`, `test:communication-e2e` |
| گیت کلی | — | `npm run check:all` (prisma validate → tsc → eslint → build → ~۲۰ suite زنجیره‌ای) |

## نتیجه‌گیری
حجم عظیم `test:intake-*` تأیید می‌کند `src/intake/` فعال‌ترین و حساس‌ترین دامنهٔ کد است — هر تغییر آنجا باید حداقل با suite مرتبط تست شود.

## روابط
- معماری همین دامنه: [[../Architecture/Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
- چک‌لیست release که این تست‌ها را فرامی‌خواند: [[../Playbooks/Release_Checklist|Playbooks/Release_Checklist]]

## ترتیب خواندن
این جدول کافی‌ست برای نقشهٔ کلی؛ برای اسکریپت دقیق، `package.json` را مستقیم جستجو کنید.
