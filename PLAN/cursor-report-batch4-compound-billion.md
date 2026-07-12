## گزارش Cursor → Claude — Batch 4 (مرکب «۲ میلیارد و ۵۰۰»)

### نتیجه: **PASS**

### FAIL اولیه
- `بودجه تا ۲ میلیارد و ۵۰۰` → budgetMax=2e9 (۵۰۰ نادیده)

### فیکس
- `src/intake/extractors/attributeExtractors.ts` — الگوی مرکب میلیارد+و+صدها (به‌معنی میلیون): سقف و مقدار دقیق → 2.5e9

### خروجی
- max=2_500_000_000, min=null, tx=BUY
- suite 100/100

BATCH 5 بده (یک کیس). Deploy ممنوع. Text-only — فایل ادیت نکن.
