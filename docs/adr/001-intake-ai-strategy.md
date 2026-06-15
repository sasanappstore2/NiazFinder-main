# ADR-001: Rules-First, AI-Enhance — استراتژی هوش مصنوعی intake

| | |
|---|---|
| **وضعیت** | پذیرفته‌شده (فاز ۲) |
| **تاریخ** | ۲۰۲۶-۰۶-۰۹ |
| **دامنه** | `/post` — analyze، title، listing copy |
| **مالک** | فاز ۳۱ (abstraction provider)، فاز ۱۶ (validation) |

---

## Context

مسیر intake سه لایه analyze دارد (MLX، cloud AI، rules). بدون سیاست روشن، رفتار dev/production متفاوت می‌شود و outage MLX UX را می‌شکند یا publish غیرقطعی می‌شود.

فاز ۱ ثابت کرد: ۱۵۳/۱۵۳ golden با rules-only pass می‌شود؛ MLX gate جداگانه hybrid را پوشش می‌دهد.

---

## Decision

### ۱. Rules همیشه موجود و قطعی

- `intakeEngine` (`src/intake/engine/intakeEngine.ts`) **canonical** استخراج ساخت‌یافته.
- Publish gate (`publishValidator`) **فقط** از `NeedDraft` + rules تبعیت می‌کند — بدون وابستگی به LLM.
- CI gate `test:post-pipeline` بدون MLX **اجباری** است.

### ۲. AI فقط تقویت‌کننده اختیاری

- MLX (`NEED_INTAKE_LLM_ENABLED=true`): parse merge، title، copy stream.
- Cloud AI: وقتی MLX off و `AI_SEMANTIC` enabled.
- AI **نباید** فیلدهای user-locked را overwrite کند (refs در panel).

### ۳. ترتیب اجرای analyze

```
1. Rules parse (همیشه — client برای hints)
2. POST /api/intake/analyze
   a. MLX + reconcile (if NEED_INTAKE_LLM_ENABLED)
   b. else Cloud semantic
   c. else rules only
3. enrichIntakeAnalysisLocation (LRE server-side)
```

### ۴. Fallback

| حالت | رفتار |
|------|--------|
| MLX down | فاز ۳۴: circuit breaker → rules-only analyze؛ publish همچنان ممکن |
| Copy stream fail | baseline template از `listing-composer` |
| Title AI fail | heuristic → template (`vertical-title`) |

### ۵. محیط‌ها

| Env | سیاست |
|-----|--------|
| **Dev** | `NEED_INTAKE_LLM_ENABLED=true` + `dev:intake-mlx` |
| **CI smoke** | `test:post-mlx-gate` با MLX |
| **CI unit** | `test:post-pipeline` rules-only |
| **Production** | MLX on توصیه‌شده؛ rules path همیشه resilience — runbook |

---

## Consequences

### مثبت

- Publish deterministic حتی بدون MLX
- سناریوهای golden پایدار
- outage MLX تجربه را نابود نمی‌کند (فقط AI hints کمتر)

### منفی / ریسک

- دو مسیر رفتار (rules vs hybrid) — باید در gate پوشش داده شود
- merge logic پیچیده — فاز ۳۱ facade یکپارچه می‌کند

---

## Out of scope (فازهای بعد — بدون تداخل)

| موضوع | فاز |
|--------|-----|
| حذف API/chat مرده | ۳ |
| Unified validation | ۱۶ |
| `IntakeAiProvider` interface | ۳۱ |
| Training flywheel automation | ۳۸ |
| Queue async analyze | ۴۷ |

---

## Compliance checklist

- [x] مستند در `NEED_INTAKE.md`
- [x] env در `.env.example`
- [x] پیاده‌سازی circuit breaker (فاز ۳۴)
- [x] `getPublishReadiness` واحد (فاز ۱۶ ✅)
