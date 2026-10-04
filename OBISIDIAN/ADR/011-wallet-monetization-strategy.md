---
title: "ADR-011: Wallet & Monetization Strategy"
tags: [adr, wallet, business]
status: accepted
---

# ADR-011: Wallet & Monetization Strategy

> این ADR کار عملی همین جلسه (۲۰۲۶-۰۷-۱۶) را مستند می‌کند — برخلاف بقیهٔ ADR های جدید، این یکی تصمیم واقعی مستقیم از این کار است، نه صرفاً استنباط از کد قدیمی.

**وضعیت**: پذیرفته‌شده — ۲۰۲۶-۰۷-۱۶

## Context
پلتفرم به یک مدل درآمدی پایدار نیاز داشت که هم برای کاربر عادی رایگان و ساده باشد و هم برای کسب‌وکار ROI مثبت بسازد. بررسی کد نشان داد کیف پول و پرداخت لید VIP از قبل ساخته و live بودند (فی تخت ۵۰۰۰ تومان)؛ درگاه پرداخت، اشتراک، رفرال، و اعتبار هدیه کاملاً greenfield بودند.

## Decision
1. **مدل Pay-as-you-go + Wallet** به‌عنوان مدل اصلی — نه اشتراک اجباری.
2. **قیمت‌گذاری دو سطحی لید**: عادی ۱۰هزار تومان، باکیفیت (شماره تاییدشده + بودجه + منطقه + urgency مشخص) ۲۰هزار تومان — جایگزین فی تخت قبلی.
3. **درگاه Zarinpal** فقط برای شارژ کیف پول (نه پرداخت مستقیم روی هر اکشن) — طبق قانون «تمام پرداخت‌ها از Wallet انجام شود».
4. **اشتراک Free/Pro/Business** به‌عنوان لایهٔ تخفیف روی فی لید (نه جایگزین Pay-as-you-go) — بدون تمدید خودکار پیچیده در فاز اول.
5. **اعتبار هدیهٔ ثبت‌نام** فقط برای کسب‌وکارهای جدید (نه هر CLIENT) — جلوگیری از سوءاستفادهٔ ساده.
6. **رفرال مشروط**: پاداش فقط بعد از ثبت‌نام + تکمیل پروفایل + مشاهدهٔ اولین لید.
7. **الگوی idempotent lock-check** (`SELECT ... FOR UPDATE` + چک idempotency دوباره) برای هر مسیر پولی جدید تکرار شد — بدون آن، ریسک double-credit در retry واقعی است.

## Alternatives
- **اشتراک صرف (subscription-only)**: ساده‌تر برای پیش‌بینی درآمد، اما با اصل «کاربر فقط برای ارزش واقعی هزینه کند» ناسازگار بود چون کسب‌وکار کم‌فعالیت هم مجبور به پرداخت ماهانه می‌شد.
- **Dynamic pricing پیچیده (auction/bid برای لید)**: رد شد صراحتاً طبق قانون کاربر «از Dynamic Pricing پیچیده استفاده نشود».
- **پرداخت مستقیم درگاه روی هر اکشن (بدون کیف پول واسط)**: هزینهٔ تراکنش درگاه بالاتر برای فی‌های کوچک (۱۰-۲۰هزار تومان)، تجربهٔ کاربری کندتر.

## Consequences
- تمام مسیرهای پولی جدید (deposit callback، signup bonus، referral reward، subscription upgrade) باید همان الگوی lock-check را رعایت کنند — این یک قرارداد تیمی دستی است.
- دو سطح فی لید نیاز به هماهنگی UI بین `SmartLeadsSection` و `PrivateLeadsPanel` داشت (که در همین کار انجام شد).
- ریسک عملیاتی واقعی: تغییرات schema این مدل (`User.referralCode`, `Subscription`) وقتی با `prisma db push` روی دیتابیس drift‌دار اعمال شدند، باعث افت داده‌ای ناخواسته در جداول نامرتبط شدند (`Category.status`, `ServiceRequest.idempotencyKey`) — به [[../Debug/README|Debug/]] مراجعه کنید.

## Trade-offs
سادگی و شفافیت قیمت‌گذاری ثابت (نه dynamic) در برابر از دست‌دادن بهینه‌سازی درآمد بر اساس تقاضای واقعی بازار — تصمیم آگاهانه به نفع سادگی در فاز اول.

## Future considerations
- تبلیغات/جایگاه ویژه و گزارش بازار به‌عنوان بک‌لاگ آینده مستند شدند (نه پیاده‌سازی شده) — به [[../RFC/001-ads-featured-placement|RFC-001]] و [[../RFC/002-market-data-reports|RFC-002]] مراجعه کنید.
- تمدید خودکار اشتراک (auto-renew) در schema فیلد `autoRenew` را دارد اما منطق واقعی تمدید هنوز پیاده نشده — کار آینده.

## روابط
- [[../Architecture/Backend/wallet-payments|Architecture/Backend/wallet-payments]]
- [[../Architecture/Backend/smart-matching|Architecture/Backend/smart-matching]]
- [[../Business Logic/README|Business Logic/]]
- [[../Decision Logs/README|Decision Logs/]] (تصمیم کوچک‌تر: قیمت دقیق دو سطح)
