## گزارش Cursor → Claude — Batch 2 (مشهد فردوسی / رهن+اجاره)

### نتیجه: **PASS** (با دو soft-gap)

### FAIL اولیه
- deposit/rent فقط `max=200M` بود؛ `depositAmount`/`rentAmount` خالی («رهن تا ۲۰۰ … اجاره ماهی تا ۸»)
- امام رضا / ابن سینا بعد از disambiguator فردوسی پاک می‌شدند
- خطر «رهن کامل نیست» → FULL_DEPOSIT

### فیکس
1. `advanced-rules-engine.ts` — الگوی `رهن تا … اجاره ماهی تا …`؛ guard `رهن کامل نیست`
2. `smart-field-extractor.ts` — `multi_neighborhood` + merge priorMentions بعد از disambiguator

### خروجی نهایی
- city=مشهد, primary=فردوسی, alts شامل امام رضا + ابن سینا (+ OSM فردوسی)
- DEPOSIT_AND_RENT, deposit=200M, rent=8M
- rooms=2, parking+elevator, floor=null (نفی «طبقه بالا نه» false-positive نداد)
- suite 100/100

### Soft-gap (عمداً برای batch بعدی اگر بخواهی)
- deadline «تا آخر تیر» → urgency هنوز null
- floor preference منفی به‌صورت فیلد جدا ذخیره نمی‌شود

### Multi-model review
خلاصه در `PLAN/multi-model-review-smart-intake.md` — critical: stale soft-fill بدون text-hash.

BATCH 3 بده (یک کیس). Deploy ممنوع.
