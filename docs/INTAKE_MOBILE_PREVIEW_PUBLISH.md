# فاز ۲۹ — موبایل: Preview & Publish

## هدف

پیش‌نمایش تمام‌عرض، ویرایش inline، انتشار از footer، موفقیت fullscreen با اشتراک‌گذاری.

## ۱۰ بخش

| # | کار | خروجی |
|---|-----|--------|
| ۲۹.۱ | کارت full-width | `IntakeMobilePreviewCard` |
| ۲۹.۲ | edit title inline | `IntakeMobilePreviewTitle` |
| ۲۹.۳ | edit desc expandable | `IntakeMobilePreviewDescSheet` |
| ۲۹.۴ | publish sticky footer | shell CTA + بدون inline publish |
| ۲۹.۵ | success fullscreen | `IntakeMobilePublishSuccess` |
| ۲۹.۶ | redirect listing | `intake_mobile_listing_redirect` |
| ۲۹.۷ | share بعد publish | `shareIntakeListing` |
| ۲۹.۸ | offline queue | `queueOfflineIntakePublish` (flag) |
| ۲۹.۹ | ۴۲۲ readable | `IntakeMobileValidationBanner` |
| ۲۹.۱۰ | time-to-publish | `intake_time_to_publish` < 120s KPI |

## env

```bash
# optional offline publish queue toast (phase 29.8)
NEXT_PUBLIC_INTAKE_OFFLINE_PUBLISH_QUEUE=true
```

## تست

```bash
npm run test:mobile-preview-publish
npm run verify:intake-phase -- --phase 29
```
