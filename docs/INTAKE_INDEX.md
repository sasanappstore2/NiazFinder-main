# Intake documentation index

ایندکس مرکزی مستندات `/post`. قبل از هر تغییر [`INTAKE_EXECUTION.md`](./INTAKE_EXECUTION.md) را بخوانید — **مرز هر فاز** آنجاست.

---

## شروع سریع

| نیاز | سند |
|-----|-----|
| راه‌اندازی dev | [LOCAL_DEV_RUNBOOK.md](./LOCAL_DEV_RUNBOOK.md) § `/post` |
| معماری کامل | [NEED_INTAKE.md](./NEED_INTAKE.md) |
| برنامه ۵۰ فاز | [INTAKE_EXECUTION.md](./INTAKE_EXECUTION.md) |
| baseline تست | [../reports/intake-baseline.json](../reports/intake-baseline.json) |

---

## قراردادها و داده

| سند | محتوا | فاز |
|-----|--------|-----|
| [INTAKE_NEED_DRAFT.md](./INTAKE_NEED_DRAFT.md) | قرارداد `NeedDraft` | ۲ ✅ |
| [intake-schema-versions.md](./intake-schema-versions.md) | `schemaVersion` | ۴ |
| [INTAKE_CATEGORY_FILTERS.md](./INTAKE_CATEGORY_FILTERS.md) | فیلدهای داینامیک دسته | ۲ ✅ |

---

## تصمیمات معماری (ADR)

| ADR | عنوان | فاز |
|-----|--------|-----|
| [001-intake-ai-strategy.md](./adr/001-intake-ai-strategy.md) | Rules-First, AI-Enhance | ۲ ✅ |
| [002-intake-validation-unified.md](./adr/002-intake-validation-unified.md) | `getPublishReadiness` SSoT | ۱۶ ✅ |
| Browse | [DYNAMIC_ANSWERS_SCHEMA.md](./DYNAMIC_ANSWERS_SCHEMA.md) · [INTAKE_BROWSE_E2E.md](./INTAKE_BROWSE_E2E.md) | ۱۹ ✅ |

---

## سرویس‌ها

| سند | محتوا |
|-----|--------|
| [../mini-services/intake-mlx/README.md](../mini-services/intake-mlx/README.md) | MLX API، adapter، train |
| [NEED_INTAKE_ML.md](./NEED_INTAKE_ML.md) | یادداشت‌های dev (قدیمی) |
| [DIVAR_REAL_ESTATE_MATRIX.md](./DIVAR_REAL_ESTATE_MATRIX.md) | parity املاک |

---

## Obsidian

| Note | لینک |
|------|------|
| محصول | [../OBISIDIAN/10_Product_Areas/02_Need_Intake.md](../OBISIDIAN/10_Product_Areas/02_Need_Intake.md) |

---

## نقشه فاز → سند (بدون تداخل)

| فاز | سند مسئول | وضعیت |
|-----|-----------|--------|
| ۱ | `intake-baseline.json`, `INTAKE_EXECUTION` | ✅ |
| ۲ | همه سندهای این ایندکس | ✅ |
| ۳ | `NEED_INTAKE` § منسوخ | ✅ |
| ۴ | `intake-schema-versions` | ✅ enforce |
| ۵ | [INTAKE_RELEASE_CHECKLIST.md](./INTAKE_RELEASE_CHECKLIST.md) | CI script |
| ۶–۱۵ | `NEED_INTAKE` § UI | refactor panel |
| ۱۶–۲۰ | `INTAKE_NEED_DRAFT` § validation | unified gate |
| ۳۱–۳۵ | ADR-001 | provider impl |
| ۴۵–۴۹ | [INTAKE_PUBLIC_API.md](./INTAKE_PUBLIC_API.md) | quality → API |
| ۵۰ | [INTAKE_GOVERNANCE.md](./INTAKE_GOVERNANCE.md) | ✅ program complete |
| AI 12h | [INTAKE_AI_12H_CURRICULUM.md](./INTAKE_AI_12H_CURRICULUM.md) | مکان + دسته↔شغل |

---

## دستورات gate

```bash
npm run test:post-pipeline
NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_COPY_AI_ENABLED=true npm run test:post-mlx-gate
npm run test:post-production-gate:smoke
```
