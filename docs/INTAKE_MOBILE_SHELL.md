# Intake Mobile Layout (وضعیت فعلی)

> **توجه:** shell تمام‌صفحه موبایل (`IntakeMobileShell`) حذف شده است. `/post` از AppShell استاندارد استفاده می‌کند.

## رفتار فعلی

| عنصر | موبایل |
|------|--------|
| Header سایت | visible |
| Bottom nav | visible (`lg:hidden`) |
| Padding پایین | `intake-panel-card__body` + `--mobile-nav-offset` |
| Sticky CTA | `.intake-sticky-actions` بالای nav |
| خلاصه زنده | `IntakeMobileSummarySheet` (bottom sheet) |

## فایل‌های کلیدی

| فایل | نقش |
|------|-----|
| [`NeedIntakePanel.tsx`](../src/components/need-intake/NeedIntakePanel.tsx) | layout اصلی + `pb-[calc(var(--mobile-nav-offset)+0.5rem)]` |
| [`intake-golden.css`](../src/styles/intake-golden.css) | sticky actions، padding موبایل |
| [`use-intake-mobile-chrome.ts`](../src/hooks/use-intake-mobile-chrome.ts) | همیشه `false` — fullscreen غیرفعال |
| [`IntakeMobileSummarySheet.tsx`](../src/components/need-intake/IntakeMobileSummarySheet.tsx) | sheet خلاصه |

## QA

[`INTAKE_MOBILE_QA.md`](INTAKE_MOBILE_QA.md) — چک‌لیست ۴۰ موردی (بدون انتظار fullscreen).

## تست smoke

```bash
npm run smoke:viewport-overflow   # شامل /post
npm run smoke:mobile-a11y
```
