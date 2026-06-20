# Category filters — فیلدهای Intake

> Registry: [`src/config/category-filters/registry.ts`](../src/config/category-filters/registry.ts)  
> Specs: [`src/config/category-filters/specs.ts`](../src/config/category-filters/specs.ts)  
> Section builder: [`src/intake/template/buildIntakeSections.ts`](../src/intake/template/buildIntakeSections.ts)  
> UI pills: [`IntakeSectionMenus.tsx`](../src/components/need-intake/IntakeSectionMenus.tsx)

فیلدهای اضافی دسته در مرحله **location** از registry بارگذاری می‌شوند و در بخش **«افزودن اطلاعات (اختیاری)»** به‌صورت pill نمایش داده می‌شوند (مثلاً «مشخصات ملک»، «بودجه» برای املاک).

---

## سلسله merge

```
ROOT_SPECS → PARENT_SPECS → LEAF_SPECS → INTAKE_TAIL
```

ورودی: `getIntakeFieldsForCategory(categorySlug)` — فقط `audience: need | both` برای intake.

`resolveTemplate()` فیلدها را با `buildIntakeSections()` در sectionهای معنادار گروه‌بندی می‌کند (`sectionGroups.ts` + `pack-intake-manifest.ts`).

---

## فیلترهای حیاتی اختیاری (Critical)

کاتالوگ: [`critical-intake-catalog.ts`](../src/intake/template/critical-intake-catalog.ts) (تولید: `npm run generate:critical-intake-catalog`)

- `intakeTier: 'critical'` در `specs.ts` — فیلدهای اختیاری مهم برای تطبیق کسب‌وکار
- `IntakeTemplate.criticalFields` / `criticalSectionKeys` — بخش‌های مرتبط **پیش‌فرض باز** با برچسب «مهم برای تطبیق»
- AI فقط **چیپ پیشنهادی** می‌دهد (`suggestedFilters`) — بدون auto-fill در `answers`
- تست: `npm run test:critical-intake-catalog` و `npm run test:critical-suggestions`

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

### ۲. Section group (اگر section جدید لازم است)

در [`sectionGroups.ts`](../src/intake/template/sectionGroups.ts) فیلد را به `fieldToSection` ریشه مربوطه اضافه کنید (مثلاً `buildingAge` → `property-specs`).

### ۳. Entity در draft

مقدار در `draft.answers.buildingAge` یا entities — از projection و publish در `flatten-draft-answers-for-publish.ts` به browse منتقل می‌شود.

### ۴. Publish (اگر required)

- اضافه به `requiredFields` در [`needTypes.ts`](../src/intake/schema/needTypes.ts) **فقط** اگر gate لازم است
- وگرنه optional در spec (بدون validator)

**فاز ۱۶:** `showIf` fields در validator شرطی می‌شوند.

### ۵. Golden scenario

سناریو در [`post-golden-matrix.ts`](../src/lib/need-intake/fixtures/post-golden-matrix.ts):

```ts
{ suffix: 'building-age', need: 'آپارتمان دو خوابه نوساز با پارکینگ', expect: { buildingAge: 5 } }
```

### ۶. Browse parity

```bash
npm run test:publish-browse-parity
```

### ۷. Pack manifest (اختیاری)

اگر فیلد در rule pack `optionalFields` / `requiredFields` است:

```bash
npx tsx scripts/generate/build-pack-intake-manifest.ts
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

## تست‌ها

```bash
npm run test:category-filters
npx tsx src/intake/template/fixtures/run-intake-sections-self-test.ts
```

---

## چک‌لیست PR فیلد جدید

- [ ] spec در `specs.ts`
- [ ] mapping در `sectionGroups.ts` (اگر section مشخص لازم است)
- [ ] browse parity (اگر روی URL تأثیر دارد)
- [ ] golden scenario در post-pipeline
- [ ] `entityRegistry.hasEntityValue` اگر publish required
- [ ] مستند در این فایل (یک خط)
