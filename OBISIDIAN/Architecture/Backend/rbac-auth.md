---
title: "Architecture: RBAC & Auth"
tags: [architecture, backend, security]
status: live
---

# RBAC & Authentication (`src/lib/auth/`, `src/lib/rbac/`)

## هدف
احراز هویت (ثبت‌نام/ورود تلفنی + OTP + رمز عبور) و کنترل دسترسی نقش‌محور.

## نقش‌ها
`UserRole = CLIENT | SPECIALIST | ADMIN | SUPER_ADMIN` (schema، خط ~۹۲) — `canManageBusinessProfile(role)` در `src/lib/business/can-manage-business-profile.ts` برای SPECIALIST/ADMIN/SUPER_ADMIN صادق است.

## جریان ثبت‌نام واقعی (نه چیزی که در ابتدا به نظر می‌رسد)
مسیر واقعی ثبت‌نام **تلفنی** است: `src/app/api/auth/register-phone/route.ts`، صدا زده شده از `registerWithPhonePassword` در `src/lib/store.ts` (Zustand)، از کامپوننت `src/components/auth/PhoneOtpForm.tsx`. یک صفحهٔ `/register` + `RegisterForm.tsx` ایمیل-محور هم در ریپو هست اما به یک endpoint غیرموجود (`/api/auth/register`) پست می‌کند — **legacy/مرده**، احتیاط در استفاده.

## فایل‌های کلیدی
- `src/app/api/auth/{register-phone,login-phone,check-phone,otp,verify}/route.ts`
- `src/lib/auth/password.ts`, `phone-auth-response.ts`, `dev-phone-auth.ts`
- `src/lib/rbac/` (۶ فایل)
- `src/config/admin-permissions.ts`

## روابط
- استراتژی معماری: [[../../ADR/008-authentication-strategy|ADR/008-authentication-strategy]]
- محصول: [[../../10_Product_Areas/08_Auth_Account|10_Product_Areas/08_Auth_Account]]
- ادمین/Moderation: [[../../10_Product_Areas/15_Admin_SuperAdmin|10_Product_Areas/15_Admin_SuperAdmin]]
