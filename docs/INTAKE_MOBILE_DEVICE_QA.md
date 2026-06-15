# QA دستگاه — موبایل Intake

چک‌لیست تست دستی فاز ۲۶ (iOS + Android).

## iOS Safari

- [ ] shell تمام‌صفحه بدون پرش آدرس‌بار
- [ ] safe-area بالا/پایین درست
- [ ] CTA پایین 56px در دسترس شست
- [ ] scroll body نرم، footer ثابت
- [ ] swipe-back به مرحله قبل (نه خروج ناگهانی)
- [ ] textarea بدون zoom ناخواسته (font ≥ 16px)
- [ ] keyboard باز: footer قابل دیدن

## Android Chrome

- [ ] 100dvh بدون jump هنگام scroll
- [ ] back gesture → مرحله قبل
- [ ] CTA sticky پایین
- [ ] mega menu دسته در viewport
- [ ] GPS «موقعیت من» کار می‌کند
- [ ] preview + publish از footer

## Lighthouse mobile a11y (هدف > 90)

- [ ] دکمه back دارای `aria-label`
- [ ] footer CTA با label فارسی
- [ ] کنتراست دکمه‌ها
- [ ] focus visible روی CTA

```bash
npm run test:mobile-shell
```
