# چک‌لیست QA موبایل — ثبت نیاز (/post)

۴۰ مورد برای flow کامل موبایل (< 768px) — فاز ۳۰.۱.

## Shell و ناوبری

- [ ] **01.** هدر سایت پنهان در /post موبایل
- [ ] **02.** bottom nav پنهان
- [ ] **03.** shell: back + عنوان + مرحله N/4
- [ ] **04.** footer CTA ۵۶px ثابت
- [ ] **05.** swipe/back مرورگر → مرحله قبل
- [ ] **06.** 100dvh بدون پرش کیبورد

## مرحله نیاز

- [ ] **07.** autofocus textarea
- [ ] **08.** chips افقی scroll-snap
- [ ] **09.** voice mic (اگر flag فعال)
- [ ] **10.** CTA پایین فقط (نه inline)

## مرحله توضیحات

- [ ] **11.** bottom sheet جزئیات
- [ ] **12.** skip banner متن کافی
- [ ] **13.** font 16px بدون zoom iOS

## مرحله مکان

- [ ] **14.** دسته bottom sheet
- [ ] **15.** شهر modal
- [ ] **16.** محله chips
- [ ] **17.** نقشه fullscreen
- [ ] **18.** GPS دکمه بزرگ
- [ ] **19.** shard bar جمع‌شونده
- [ ] **20.** فیلترها accordion

## پیش‌نمایش و انتشار

- [ ] **21.** کارت browse تمام‌عرض
- [ ] **22.** ویرایش عنوان inline
- [ ] **23.** توضیحات bottom sheet
- [ ] **24.** بنر ۴۲۲ خوانا
- [ ] **25.** publish فقط از footer
- [ ] **26.** success fullscreen
- [ ] **27.** share بعد publish (اگر پشتیبانی)
- [ ] **28.** redirect به /v/[id]

## سناریوهای E2E

- [ ] **29.** خدمات: بدون pin منتشر شود
- [ ] **30.** املاک مشهد: pin الزامی
- [ ] **31.** home seed → skip need
- [ ] **32.** auth gate → resume publish
- [ ] **33.** offline toast (flag)
- [ ] **34.** عنوان generic رد شود
- [ ] **35.** توضیح کوتاه رد شود

## a11y و perf

- [ ] **36.** safe-area notch
- [ ] **37.** reduced-motion OK
- [ ] **38.** lazy load location/preview chunk
- [ ] **39.** haptic اختیاری (flag)
- [ ] **40.** زمان کل < ۱۲۰s (KPI)

```bash
npm run test:mobile-release
npm run verify:intake-phase -- --phase 30
```
