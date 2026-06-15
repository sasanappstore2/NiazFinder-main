# Mobile Shell (فاز ۲۶)

ویزارد `/post` در موبایل (< 768px) تمام‌صفحه با header/footer ثابت.

## ساختار

```
IntakeMobileShell
  ├── header (back + title + مرحله N/4)
  ├── body (scroll)
  └── footer (CTA 56px)
```

## AppShell

در `/post` + موبایل:
- هدر سایت پنهان
- فوتر و bottom nav پنهان
- `h-dvh` fullscreen

## میانبرها

- **بازگشت header** → مرحله قبل (need → خانه)
- **سوایپ/دکمه back مرورگر** → `useIntakeSwipeBackGuard`

## فایل‌ها

| فایل | نقش |
|------|-----|
| `IntakeMobileShell.tsx` | UI shell |
| `intake-mobile-cta.ts` | برچسب/وضعیت CTA |
| `use-intake-mobile-chrome.ts` | تشخیص fullscreen |
| `use-intake-swipe-back-guard.ts` | guard popstate |

## تست

```bash
npm run test:mobile-shell
npm run verify:intake-phase -- --phase 26
```
