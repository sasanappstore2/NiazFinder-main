# Mobile UX Roadmap

یکپارچه‌سازی تجربه موبایل و دسترسی‌پذیری در نیازفایندر — وضعیت پیاده‌سازی و چک‌لیست QA.

## Breakpoints

| Tier | Width | Nav |
|------|-------|-----|
| Phone | &lt;640px | Bottom nav |
| Tablet | 640–1023px | Bottom nav |
| Laptop+ | ≥1024px | Header only |

مرجع: [`RESPONSIVE.md`](RESPONSIVE.md)، [`responsive-golden.css`](../src/styles/responsive-golden.css)

## Design tokens (فاز ۰)

- `Button` / `Input`: `max-lg:min-h-11` برای touch
- `sheet-safe-area` / `sheetSafeAreaClass()` برای sheet و sticky bar
- `MobileBottomNav`: `lg:hidden`
- `.has-mobile-nav`: padding فقط زیر `1024px`
- `.hover-reveal`: visible روی touch، hover-only روی desktop

## مسیرهای critical — Definition of Done

| Route | Overflow 375px | Touch ≥44px | Notes |
|-------|------------------|-------------|-------|
| `/` | ✓ smoke | chips/composer | HomeLeadLanding |
| `/post` | ✓ smoke | sticky CTA + nav offset | shell استاندارد (بدون fullscreen wizard) |
| `/browse`, `/n` | ✓ smoke | filter pills | header stack تا `lg` |
| `/chat` | ✓ smoke | list-first موبایل | minimal chrome |
| `/b/[slug]` | manual | gallery hover-reveal | tabs scroll |
| `/dashboard` | ✓ smoke | tab scroll | |
| `/messages` | redirect → `/chat` handheld | | |

## دستورات QA

```bash
npm run smoke:viewport-overflow   # 320–1280px overflow
npm run smoke:mobile-a11y         # 375px labels + overflow
npm run health:gate:mobile        # هر دو
```

Viewport matrix دستی: 320, 375, 390, 428, 640, 768, 1024, 1280, 1536.

## Intake موبایل

shell تمام‌صفحه **غیرفعال** است. رفتار فعلی:

- AppShell معمولی (header + bottom nav)
- padding پایین در [`intake-golden.css`](../src/styles/intake-golden.css) و [`NeedIntakePanel`](../src/components/need-intake/NeedIntakePanel.tsx)
- sticky actions بالای nav

چک‌لیست: [`INTAKE_MOBILE_QA.md`](INTAKE_MOBILE_QA.md)

## Admin

- جداول analytics: scroll افقی + card fallback زیر `lg` (Retention explorer)
- Nellavio: drawer موبایل موجود
- Legacy `/admin`: sidebar overlay `<lg`

## فازهای بعدی (نگهداری)

1. گسترش card fallback به analytics tabs باقی‌مانده
2. `@axe-core/playwright` در CI (اختیاری)
3. بازبینی `sm:flex-row` در headerهای dense
