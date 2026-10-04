---
title: "ADR-008: Authentication Strategy"
tags: [adr, security]
status: accepted
---

# ADR-008: Authentication Strategy

> ⚠️ **این ADR بر پایهٔ observation کد در تاریخ ۲۰۲۶-۰۷-۱۶ نوشته شده، نه تاریخچهٔ واقعی مستندشدهٔ تصمیم‌گیری.**

**وضعیت**: پذیرفته‌شده (استنباط‌شده از کد فعلی)

## Context
پروژه در ایران فعالیت می‌کند جایی که شمارهٔ موبایل شناسهٔ اصلی هویت کاربر است (نه ایمیل) و OTP پیامکی رایج‌ترین روش تأیید است.

## Decision
احراز هویت **تلفن-محور**: ثبت‌نام/ورود با شماره موبایل + کد OTP + رمز عبور (`src/app/api/auth/register-phone`, `login-phone`, `otp`, `verify`). JWT برای session (`issueAuthToken` در `src/lib/auth/phone-auth-response.ts`). یک مسیر ایمیل-محور قدیمی‌تر (`/register`, `RegisterForm.tsx`) در کد باقی مانده اما endpoint آن (`/api/auth/register`) وجود ندارد — عملاً کد مرده است.

## Alternatives
- **OAuth/SSO (Google, Apple)**: پذیرش کمتر در بازار هدف ایران به‌دلیل محدودیت‌های دسترسی به برخی سرویس‌های خارجی.
- **ایمیل + رمز عبور صرف**: نرخ استفادهٔ ایمیل فعال در بازار هدف پایین‌تر از موبایل است.
- **Magic link**: پیچیدگی deliverability ایمیل در ایران.

## Consequences
- شمارهٔ موبایل فیلد `@unique` کلیدی روی `User` است؛ منطق‌های زیادی (رفرال، اعتبار هدیه، اطلاع‌رسانی) به آن گره خورده‌اند.
- کد مرده (`RegisterForm.tsx` + صفحهٔ `/register`) در ریپو باقی مانده و می‌تواند مهندس جدید را گمراه کند — نیاز به یا حذف یا فیکس اتصال به `register-phone`.

## Trade-offs
سادگی برای بازار هدف (تلفن-محور) در برابر بار نگهداری زیرساخت OTP (هزینهٔ پیامک، rate limiting، `ALLOW_TEST_OTP` برای dev).

## Future considerations
- تصمیم دربارهٔ آیندهٔ `RegisterForm.tsx`/`/register` (حذف یا اتصال درست به `register-phone`).
- بررسی افزودن OAuth به‌عنوان روش دوم (نه جایگزین) در صورت رشد کاربران غیر-ایرانی.

## روابط
- [[../Architecture/Backend/rbac-auth|Architecture/Backend/rbac-auth]]
- [[011-wallet-monetization-strategy|ADR-011]] (رفرال به شمارهٔ تلفن/User.id گره خورده)
