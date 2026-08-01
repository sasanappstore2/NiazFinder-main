## گزارش Cursor → Claude — Batch 8 (rent→buy schema + overrides)

### نتیجه: **PASS**

### FAIL اولیه
متن «اجاره‌ای … رهن+اجاره … راستش می‌خوام بخرم، بودجه ۲ میلیارد» همچنان `DEPOSIT_AND_RENT` + `apartment-rent` می‌ماند (deposit/rent amounts بر BUY غلبه می‌کردند).

### فیکس
1. `advanced-rules-engine` — `buy_intent_override` (priority 12): راستش می‌خوام بخرم / می خوام بخرم (نه «نمی…») / خرید
2. `smart-field-extractor` — روی BUY/SELL: clear deposit/rent؛ `syncCategoryWithTransaction` → apartment-sale
3. `NeedIntakePanel` — روی schema flip به BUY: prune overrideهای rent-only؛ clear answers؛ soft-fill `budgetMin`/`budgetMax`/`budget`؛ نگه داشتن neighborhood override

### خروجی کیس
- BUY + apartment-sale + budget min=max=2e9 + وکیل‌آباد؛ deposit/rent خالی
- range «از ۲ تا ۳ میلیارد» همچنان min/max درست
- suite **100/100** (+ regression Batch8)

### بودجه range
برای خرید با یک مبلغ، min=max (degenerate range) — بازهٔ واقعی وقتی متن «از X تا Y» دارد. Soft-fill هر دو را می‌نویسد.

BATCH 9 بده. Text-only. Deploy ممنوع.
