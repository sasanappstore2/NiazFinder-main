# Intake Validation — فاز ۱۶–۲۰ (Release)

> منبع واحد: `getPublishReadiness` / `validatePublishRequest` · ADR: [002-intake-validation-unified.md](./adr/002-intake-validation-unified.md)

## لایه‌ها

| لایه | ماژول | نقش |
|------|--------|-----|
| Draft | `getPublishReadiness` | فیلدهای اجباری need type + category filters |
| Preview | `validateListingPreviewForPublish` | عنوان + حداقل توضیحات |
| Client+Server | `validatePublishRequest` | gate واحد انتشار |
| API | `parsePublishNeedBody` (Zod) + 422 `{ field, message }` | parity |

## پیام‌های فارسی

- `PUBLISH_FIELD_MESSAGES` — فیلدهای draft
- `listingTitleRejectMessage` — عنوان آگهی
- `formatPublishValidationToast` — toast بدون «خطا»ی کلی

## تله‌متری ۴۲۲

- Client: `intake_publish_rejected` (analytics)
- Server: `PublishValidationRejected` (migration events)
- Top fields: `transactionType`, `neighborhood`, `mapPin`

## تست‌ها

```bash
npm run test:publish-readiness
npm run test:client-server-parity
npm run test:smoke-publish-invalid
npm run test:listing-title-guards
npm run test:validation-release
npm run test:intake-baseline
```

## QA دستی

[INTAKE_VALIDATION_QA.md](./INTAKE_VALIDATION_QA.md) — ۲۰ مسیر invalid

## برچسب انتشار

`intake-validation-v1` — پس از سبز بودن همه gateها:

```bash
git tag -a intake-validation-v1 -m "Intake validation release (phases 16-20)"
```
