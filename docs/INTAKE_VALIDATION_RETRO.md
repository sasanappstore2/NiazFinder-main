# Retrospective — فازهای ۱۶–۲۰ (Validation + Browse Parity)

## خلاصه

| فاز | موضوع | خروجی کلیدی |
|-----|--------|-------------|
| ۱۶ | SSoT | `getPublishReadiness` |
| ۱۷ | Title/Copy | `guardStreamListingCopy`, preview guards |
| ۱۸ | Client-Server | `validatePublishRequest`, field errors |
| ۱۹ | Browse | `flattenDraftAnswersForPublish`, 34 parity cases |
| ۲۰ | Release | docs, telemetry, `validation-release` gate |

## چه خوب بود

- یک gate برای client و server
- تست ۱۰۰+ draft parity بدون drift
- پیام فارسی زیر فیلد در location

## بدهی به فاز ۲۱+

- Preview card = browse card (فاز ۲۱)
- Toast هنوز در برخی hookهای legacy encoding مخدوش دارد — بازبینی دوره‌ای
- نرخ ۴۲۲ production — مانیتور با `PublishValidationRejected` events

## Gate نهایی

```bash
npm run test:validation-release
npm run test:intake-baseline
git tag intake-validation-v1
```
