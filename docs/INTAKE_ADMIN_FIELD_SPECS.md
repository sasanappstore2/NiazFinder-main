# Admin Self-Service — فیلدهای Intake (فاز ۴۲)

تگ: `intake-admin-field-specs-v1`

## مسیر ادمین

`/super-admin/system/intake-field-specs`

مجوزها:
- `ops:intake-field-specs:read`
- `ops:intake-field-specs:write`

## قابلیت‌ها

| # | قابلیت | مسیر |
|---|--------|------|
| 42.1 | CRUD فیلد | داشبورد ادمین |
| 42.2 | اعتبارسنجی Zod | `intake-field-spec-schema.ts` |
| 42.3 | export به specs.ts | API export |
| 42.4 | پیش‌نمایش فرم | `IntakeFieldSpecPreview` |
| 42.5 | versioning | store JSON |
| 42.6 | rollback | API rollback |
| 42.7 | sync دسته | `intake-field-spec-sync.ts` |
| 42.8 | audit log | `logAdminAction` |
| 42.9 | بدون deploy | runtime overlay + API عمومی |
| 42.10 | مستندات | این فایل |

## Runtime (بدون deploy)

1. ادمین فیلد را ذخیره می‌کند → `data/intake-field-spec-overrides.json`
2. سرور: `getIntakeFieldsForCategory` override را merge می‌کند
3. کلاینت: `GET /api/intake/field-spec-overrides?categorySlug=...`

## API

| Method | Path |
|--------|------|
| GET | `/api/super-admin/intake-field-specs` |
| POST | `/api/super-admin/intake-field-specs` |
| GET | `/api/super-admin/intake-field-specs/{slug}` |
| DELETE | `/api/super-admin/intake-field-specs/{slug}` |
| POST | `/api/super-admin/intake-field-specs/{slug}/rollback` |
| GET | `/api/super-admin/intake-field-specs/{slug}/export?format=ts` |
| GET | `/api/intake/field-spec-overrides?categorySlug=` |

## Env

```bash
# اختیاری — مسیر store
INTAKE_FIELD_SPEC_STORE_PATH=data/intake-field-spec-overrides.json
```

## تست

```bash
npm run test:intake-admin-field-specs
npm run verify:intake-phase -- --phase 42
```
