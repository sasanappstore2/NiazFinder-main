# Category filters — فیلدهای Intake

> Registry: [`src/config/category-filters/registry.ts`](../src/config/category-filters/registry.ts)  
> Specs: [`src/config/category-filters/specs.ts`](../src/config/category-filters/specs.ts)  
> UI: [`IntakeCategoryFilterFields.tsx`](../src/components/need-intake/IntakeCategoryFilterFields.tsx)

فیلدهای اضافی دسته در مرحله **location** از registry بارگذاری می‌شوند و **فقط در UI intake** per vertical نمایش داده می‌شوند (نه همه browse filters).

---

## سلسله merge

```
ROOT_SPECS → PARENT_SPECS → LEAF_SPECS → INTAKE_TAIL
```

ورودی: `getIntakeFieldsForCategory(categorySlug)` — فقط `audience: need | both` برای intake.

---

## راهنمای افزودن فیلد جدید: مثال `buildingAge` در اجاره آپارتمان

### ۱. Spec در `specs.ts`

```ts
// در LEAF_SPECS['apartment-rent'] یا PARENT مرتبط:
{
  key: 'buildingAge',
  kind: 'number',
  label: 'سن بنا (سال)',
  audience: 'need',
  showIf: { field: 'transactionType', in: ['BUY', 'RENT'] },
}
```

### ۲. Entity در draft

مقدار در `draft.answers.buildingAge` یا entities — از projection و publish در `flatten-draft-answers-for-publish.ts` به browse منتقل می‌شود.

### ۳. Publish (اگر required)

- اضافه به `requiredFields` در [`needTypes.ts`](../src/intake/schema/needTypes.ts) **فقط** اگر gate لازم است
- وگرنه optional در spec (بدون validator)

**فاز ۱۶:** `showIf` fields در validator شرطی می‌شوند.

### ۴. Golden scenario

سناریو در [`post-golden-matrix.ts`](../src/lib/need-intake/fixtures/post-golden-matrix.ts):

```ts
{ suffix: 'building-age', need: 'آپارتمان دو خوابه نوساز با پارکینگ', expect: { buildingAge: 5 } }
```

### ۵. Browse parity

```bash
npm run test:publish-browse-parity
```

---

## انواع فیلد (`kind` → `FieldType`)

| kind در spec | FieldType | Renderer |
|--------------|-----------|----------|
| `text` | `text` | `FieldRenderer` |
| `number` | `number` | `FieldRenderer` |
| `price` | `price` | `PriceInput` |
| `select` | `select` | chips / select |
| `boolean` | `toggle` | switch |

---

## `showIf` conditional

```ts
showIf: { field: 'dealType', equals: 'rent' }
showIf: { field: 'dealType', in: ['rent', 'rahn'] }
```

Client: `fieldVisible()` در registry — **هنوز** هم‌راستا با `publishValidator` نیست (فاز ۱۶).

---

## تفکیک browse vs intake

| Spec | audience | مصرف |
|------|----------|---------|
| `GLOBAL_NEED_BROWSE_SPEC` | browse URL filters | `/n/*` |
| `INTAKE_TAIL` | intake only | `/post` location step |
| `both` | هر دو | shared |

**قانون طلایی:** هر browse spec جدید باید در `publish-browse-parity` پاس شود؛ هر intake spec جدید در `test:post-pipeline`.

---

## چک‌لیست PR فیلد جدید

- [ ] spec در `specs.ts`
- [ ] browse parity (اگر روی URL تأثیر دارد)
- [ ] golden scenario در post-pipeline
- [ ] `entityRegistry.hasEntityValue` اگر publish required
- [ ] مستند در این فایل (یک خط)
