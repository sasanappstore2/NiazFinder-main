# راهنمای افزودن Vertical جدید — Intake Playbook

تگ: `intake-vertical-playbook-v1`

این سند **۱۰ گام** برای اضافه کردن یک عمودی (vertical) جدید به `/post` بدون وابستگی به نویسنده اصلی سیستم است.

**مرجع کامل (E2E):** لوله‌کشی — [`plumbing-reference.ts`](../src/lib/need-intake/verticals/plumbing-reference.ts)

---

## گام ۱ — تعریف needType در schema

**فایل:** [`src/intake/schema/needTypes.ts`](../src/intake/schema/needTypes.ts)  
**قالب:** [`needType.template.ts`](../src/intake/schema/templates/needType.template.ts)

1. یک `NeedTypeDefinition` جدید به `NEED_TYPES` اضافه کنید.
2. `vertical`، `category`، `proposalMode` و `requiredFields` را مشخص کنید.
3. در `resolveNeedType` شرط resolve اضافه کنید.

**پذیرش:** `getNeedTypeDefinition('your-type-seeking')` مقدار برمی‌گرداند.

---

## گام ۲ — فیلدهای category در filters

**فایل:** [`src/config/category-filters/specs.ts`](../src/config/category-filters/specs.ts)  
**قالب:** [`category-spec.template.ts`](../src/config/category-filters/templates/category-spec.template.ts)

1. در `ROOT_SPECS['services']` فیلدهای intake را تعریف کنید.
2. `intake: true` برای فیلدهای wizard location.
3. از `showIf` برای فیلدهای شرطی استفاده کنید.

**پذیرش:** `getIntakeFieldsForCategory('your-slug')` فیلدهای جدید را برمی‌گرداند.

جزئیات: [`INTAKE_CATEGORY_FILTERS.md`](./INTAKE_CATEGORY_FILTERS.md)

---

## گام ۳ — سیگنال‌های parse و classifier

**فایل‌ها:** `intent-parser.ts`، `vertical-classifier.ts`

**پذیرش:** `parseIntentFromText('نمونه متن')` → slug درست.

---

## گام ۴ — title builder

**فایل:** [`vertical-title.ts`](../src/lib/need-intake/vertical-title.ts)  
**قالب:** [`vertical-title.template.ts`](../src/lib/need-intake/templates/vertical-title.template.ts)

**پذیرش:** عنوان deterministic بدون AI.

---

## گام ۵ — golden matrix (۲۰ سناریو)

**قالب:** [`golden-vertical.template.ts`](../src/lib/need-intake/fixtures/templates/golden-vertical.template.ts)  
**مثال:** [`post-golden-plumbing-matrix.ts`](../src/lib/need-intake/fixtures/post-golden-plumbing-matrix.ts)

```bash
npm run test:post-pipeline
```

---

## گام ۶ — validation و publish gate

**فایل:** `publishValidator.ts`

**پذیرش:** `validateNeedDraftForPublish(draft).success`

---

## گام ۷ — browse parity

```bash
npm run test:publish-browse-parity
npm run test:preview-browse-parity
```

---

## گام ۸ — PR checklist

[`INTAKE_VERTICAL_PR_CHECKLIST.md`](./INTAKE_VERTICAL_PR_CHECKLIST.md)

---

## گام ۹ — تست pipeline محلی

```bash
npx tsc --noEmit
npm run test:intake-vertical-playbook
npm run test:post-pipeline
npm run verify:intake-phase -- --phase 41
```

---

## گام ۱۰ — review و launch

1. [`INTAKE_VERTICAL_REVIEW.md`](./INTAKE_VERTICAL_REVIEW.md)
2. [`INTAKE_VERTICAL_ONBOARDING.md`](./INTAKE_VERTICAL_ONBOARDING.md)
3. env flag در صورت نیاز

---

## نقشه فایل‌ها

| لایه | فایل |
|------|------|
| Schema | `needTypes.ts` |
| UI fields | `category-filters/specs.ts` |
| Parse | `intent-parser.ts` |
| Title | `vertical-title.ts` |
| Tests | `post-golden-*-matrix.ts` |
| Reference | `verticals/*-reference.ts` |

ویدئو: [`INTAKE_VERTICAL_VIDEO_SCRIPT.md`](./INTAKE_VERTICAL_VIDEO_SCRIPT.md)
