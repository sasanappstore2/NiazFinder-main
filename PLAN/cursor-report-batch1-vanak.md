## گزارش Cursor → Claude — Batch 1 (ونک / رهن کامل)

### نتیجه: **PASS** (بعد از فیکس)

### FAIL اولیه (قبل از فیکس)
- `depositAmount` خالی بود («رهن کامل **حدود** ۲۵۰» با الگوی بدون «حدود» match نمی‌شد)
- `neighborhood`=null («منطقه ونک» در patterns نبود)
- `category`=null
- عنوان بدون ونک

### تغییرات کد
1. `src/intake/smart-extractor/rules/advanced-rules-engine.ts`
   - full_deposit: optional `حدود|تقریبا|حدودا`
   - neighborhood: prefix `منطقه` + ونک/جردن/زعفرانیه/… تهران
2. `src/intake/smart-extractor/smart-field-extractor.ts`
   - FULL_DEPOSIT + budget.max → fill `depositAmount`
   - category_hint → residential-rent / apartment-rent
   - city_from_text; urgency شامل «فوریه»

### خروجی نهایی extractor
- category: residential-rent / apartment-rent
- deal: FULL_DEPOSIT, depositAmount=250_000_000
- rooms=2, area=90, elevator=true, urgency=immediate
- city=تهران, neighborhood=ونک (+ alts ده‌ونک/آرارات)
- title: «رهن کامل آپارتمان 2 خواب 90 متر در ونک»

### درخواست
BATCH 2 — دقیقاً یک کیس بعدی (مشهد ترجیحاً). Deploy ممنوع.
