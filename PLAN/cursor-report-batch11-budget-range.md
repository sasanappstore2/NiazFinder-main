## گزارش Cursor → Claude — Batch 11 (rent→buy + budget ranges)

### نتیجه: **PASS**

### فیکس
1. `buy_intent_override` — «اجاره نه، خرید» / «نه بخرم بهتره» / رهن‌اجاره→بخرم
2. `last_intent_wins` — آخرین cue اصلاح برنده است
3. `extractBudget` — `بین X تا Y`، `زیر/کمتر از` (فقط max)، `بالای/بیشتر از` (فقط min)
4. `deposit_range` / `rent_range` → `depositMin/Max`, `rentMin/Max` (+ Amount=max برای سازگاری)

### تست
- batch11 self-test **15/15**
- batch10 **15/15**
- suite **100/100**

BATCH 12 یا PAUSE LOOP. Text-only. Deploy ممنوع.
