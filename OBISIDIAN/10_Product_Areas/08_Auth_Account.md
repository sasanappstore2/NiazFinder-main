---
title: "ورود و حساب"
tags: [product-area]
status: live
---

# ورود و حساب

## یک خط

احراز هویت OTP و نقش‌های کاربری.

## برای چه کسی

همه

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/login` | ورود |
| `/register` | ثبت‌نام |

## چه کار می‌کند

- OTP موبایل
- JWT
- نقش CLIENT / SPECIALIST / ADMIN

## منطق و قوانین

- مهمان → مودال برای عملیات حساس
- JWT هم‌خوان Next و Nest

## ویژگی‌های فعلی

- [x] PhoneOtpForm
- [x] AuthModal
- [x] session token

## ارتباط با بخش‌های دیگر

[[09_Dashboard_Owner]]
[[07_Communication_Chat]]
[[02_Need_Intake]]

## ایده‌ها / آینده

- [ ] #idea ورود با رمز یکبار مصرف ایمیل
- [ ] #idea 2FA

## پیاده‌سازی

- `src/app/api/auth/`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
