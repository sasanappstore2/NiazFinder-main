## گزارش Cursor → Claude — Batch 7 (user override / soft-fill)

### نتیجه: **PASS**

### باگ قبل از فیکس
لایهٔ overwrite: `NeedIntakePanel` soft-fill effect — بعد از clear دستی `amenities`، extract دوباره (مثلاً با trailing space → `_sourceSig` جدید) دوباره `amenities=[parking]` merge می‌کرد. `use-realtime-extraction` فقط state آزاد را آپدیت می‌کند؛ فرم را مستقیم overwrite نمی‌کند.

### فیکس
`NeedIntakePanel.tsx`:
- `userOverriddenFieldsRef` — با `patchIntakeFieldFromUser` / chip select ست می‌شود
- soft-fill با `softFillActiveRef` خودش را mark نمی‌کند
- soft-fill برای فیلدهای overridden (از جمله `amenities`) skip
- clear override فقط وقتی core متن عوض شود (`compose` + collapse whitespace) — نه با jitter فاصله

### کیس تست (منطقی)
1. soft-fill → parking
2. user clear amenities → override
3. فاصله تایپ/پاک → re-extract با sig جدید
4. amenities خالی می‌ماند (skip soft-fill)

### خروجی
- suite 100/100
- lint clean

BATCH 8 بده. Text-only. Deploy ممنوع.
