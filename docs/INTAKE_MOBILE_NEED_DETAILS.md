# Mobile Need & Details (فاز ۲۷)

بهبود مراحل نیاز و توضیحات در موبایل.

## قابلیت‌ها

| # | موضوع |
|---|--------|
| ۲۷.۱ | textarea بزرگ + autofocus |
| ۲۷.۲ | chips افقی scroll-snap |
| ۲۷.۳ | ورود صوتی (flag) |
| ۲۷.۴ | bottom sheet جزئیات |
| ۲۷.۵ | بنر «متن کافی است» |
| ۲۷.۶ | haptic اختیاری |
| ۲۷.۷ | font 16px (بدون zoom iOS) |
| ۲۷.۹ | telemetry مدت need/details |

## env

```bash
NEXT_PUBLIC_INTAKE_VOICE_INPUT=true
NEXT_PUBLIC_INTAKE_HAPTIC=true
```

## تست

```bash
npm run test:mobile-need-details
npm run verify:intake-phase -- --phase 27
```
