# ADR-001: Rules-First, AI-Enhance — استراتژی هوش مصنوعی intake

| | |
|---|---|
| **وضعیت** | پذیرفته‌شده (فاز ۲ + Rules Registry ۲۰۲۶-۰۶) |
| **تاریخ** | ۲۰۲۶-۰۶-۰۹ (به‌روز ۲۰۲۶-۰۶-۱۶) |
| **دامنه** | `/post` — analyze، title، listing copy |
| **مالک** | فاز ۳۱ (abstraction provider)، فاز ۱۶ (validation) |

---

## Context

مسیر intake سه لایه analyze دارد (MLX، cloud AI، rules). بدون سیاست روشن، رفتار dev/production متفاوت می‌شود و outage MLX UX را می‌شکند یا publish غیرقطعی می‌شود.

فاز ۱ ثابت کرد: ۱۵۳/۱۵۳ golden با rules-only pass می‌شود؛ MLX gate جداگانه hybrid را پوشش می‌دهد.

**به‌روزرسانی ۲۰۲۶-۰۶-۱۶:** Rules Registry یکپارچه (`src/intake/rules/`) با ~۱.۱۶M rule تولیدی (~۱۰k per category pack). AI به‌طور پیش‌فرض خاموش (`NEED_INTAKE_RULES_ONLY`).

---

## Decision

### ۱. Rules همیشه موجود و قطعی

- **Rules Registry** (`src/intake/rules/registry.ts`) منبع اول category/brand/scenario.
- `intakeEngine` مکمل است؛ دیگر category را با confidence پایین‌تر از registry overwrite نمی‌کند.
- Publish gate (`publishValidator`) **فقط** از `NeedDraft` + rules تبعیت می‌کند — بدون وابستگی به LLM.
- CI gate `test:post-pipeline` بدون MLX **اجباری** است.
- CI gate `test:rules-coverage-gate` هدف ≥۹۰٪ بدون AI.

### ۲. AI فقط تقویت‌کننده اختیاری (fallback)

- پیش‌فرض: `NEED_INTAKE_RULES_ONLY=true` / همه LLM flags خاموش.
- وقتی فعال: MLX (`NEED_INTAKE_LLM_ENABLED=true`) فقط برای فیلدهای unresolved با confidence < 0.82.
- AI **هرگز** category با rules confidence ≥ 0.85 را overwrite نمی‌کند.
- AI **نباید** فیلدهای user-locked را overwrite کند (refs در panel).

### ۳. ترتیب اجرای analyze (Rules → AI → JSON → Question Engine)

```
1. unifiedNormalize
2. Rules Registry match (category, brand, scenario)
3. Resolvers: budget, property, location, deal-type
4. need-builder → NeedDraft JSON
5. question-engine + wizardBuilder → next questions
6. [optional] truth-verify / ai-resolver if AI enabled AND unresolved
```

### ۴. Fallback

| حالت | رفتار |
|------|--------|
| AI off / MLX down | rules-only analyze؛ `meta.engine=intake-intelligence` |
| Copy stream fail | baseline template از `listing-composer` |
| Title AI fail | heuristic → template (`vertical-title` + pack titleTemplates) |

### ۵. محیط‌ها

| Env | سیاست |
|-----|--------|
| **Dev (default)** | `NEED_INTAKE_RULES_ONLY=true` — بدون LLM |
| **CI unit** | `test:post-pipeline` + `test:rules-coverage-gate` rules-only |
| **CI stress** | `test:intake-zero-defect-rules-only` |
| **Staging AI** | MLX on فقط برای ارزیابی fallback |

### ۶. Rule packs

- مسیر: `src/intake/rules/packs/{slug}.pack.json`
- تولید: `npm run rules:generate -- --target 10000`
- انواع: keyword, phrase, brand, model, scenario, negative, deal, title
- seeds: `src/intake/rules/seeds/category-seeds.ts`

### ۷. Hybrid Cascade — Rules hypothesis + targeted disambiguation (۲۰۲۶-۰۶)

وقتی `NEED_INTAKE_HYBRID_ENABLED=true`:

```
1. unifiedNormalize
2. rules top-K category hypotheses → pickCategoryIfClear (fast-path)
3. اگر ambiguous && NEED_INTAKE_DISAMBIG_AI_ENABLED:
   - AI pick: یک slug از کاندیدهای رول (constrained)
   - اگر null → AI suggest یک slug → matchCategoryFromRules(slugHints) revalidate
4. scoped rules / rulesCategoryToFieldBag با نتیجه نهایی
5. resolvers: budget, property, deal-type (بدون AI)
6. location: LRE + city hypothesis → city disambiguation همان الگو
7. detectPackRequiredGaps + need-builder
8. categoryCandidates / cityCandidates در ParsedIntent برای UI
```

- `NEED_INTAKE_INTENT_SLICE_ENABLED=false` (پیش‌فرض) — vertical از رول‌ها، نه LLM intent-slice
- `runScopedFieldFill` دیگر مسیر پیش‌فرض نیست؛ جایگزین با disambiguation تخصصی category/city
- AI **هرگز** full catalog در prompt نمی‌بیند — فقط top-K از رول‌ها / CityMatcher
- `NEED_INTAKE_RULES_ONLY=true` → hybrid بدون هیچ call LLM (فقط rules + UI candidates)
- Publish gate همچنان rules-only

**Env پیشنهادی (dev با Ollama):**

```bash
NEED_INTAKE_HYBRID_ENABLED=true
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_INTENT_SLICE_ENABLED=false
NEED_INTAKE_DISAMBIG_AI_ENABLED=true
```

**تست‌ها:** `test:hybrid-intake-golden`, `test:rules-disambiguation-golden`, `test:rules-hypothesis`, `smoke:disambig-intake`

---

## Consequences

### مثبت

- Publish deterministic حتی بدون MLX
- ~۱.۱۶M rule قابل نگهداری با generator (نه دستی)
- piano/musical-instruments و collisionها با negative rules

### منفی / ریسk

- حجم packها (~۱۵۰MB JSON) — lazy load per slug در آینده
- collision بین دسته‌های generic (فروش/میفروشم) — negative rules ongoing

---

## Compliance checklist

- [x] مستند در `NEED_INTAKE.md`
- [x] env در `.env.example` (Rules-only block)
- [x] `isIntakeAiGloballyDisabled()` در orchestrator
- [x] `test:rules-coverage-gate`
- [x] `npm run rules:generate`
