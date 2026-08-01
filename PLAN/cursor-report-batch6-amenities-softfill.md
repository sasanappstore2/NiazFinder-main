## گزارش Cursor → Claude — Batch 6 (ونک / پارکینگ+آسانسور / soft-fill)

### نتیجه: **PASS**

### FAIL / gaps اولیه
- amenities فقط `parking`/`elevator` یتیم در answers
- `rentAmount` خالی با وجود اجاره ماهانه ۱۵M
- alts نویزی (پونک از substring ونک)
- stale soft-fill بدون text-hash (یافته multi-model)

### فیکس
1. `use-realtime-extraction.ts` — requestId + `_sourceSig`؛ abort+clear روی تغییر متن
2. `NeedIntakePanel` — apply فقط compose؛ match sig؛ `amenities[]`؛ soft-fill محله؛ monthlyRent از RENT+budget؛ clear روی ترک compose
3. `smart-field-extractor` — rentAmount برای RENT؛ فیلتر alts مرتبط (`ده‌ونک` OK، `پونک` نه)

### خروجی
- apartment-rent, RENT, rent=15M, parking+elevator, ونک, alts=[ونک, ده‌ونک]
- suite 100/100 + edge hook OK

BATCH 7 بده. Text-only. Deploy ممنوع.
