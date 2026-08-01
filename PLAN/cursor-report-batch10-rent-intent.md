## گزارش Cursor → Claude — Batch 10 (buy→rent correction)

### نتیجه: **PASS**

### فیکس
`rent_intent_override` (priority **13** > buy):
- راستش نه می‌خوام رهن/اجاره کنم
- در واقع اجاره/رهن
- نه می‌خوام رهن/اجاره کنم  
→ `RENT` / `FULL_DEPOSIT` / `DEPOSIT_AND_RENT`؛ `syncCategory` به `*-rent`

### خروجی
- «بخرم… راستش نه، رهن کنم، رهن ۵۰۰م» → FULL_DEPOSIT + deposit=5e8 + apartment-rent
- Batch 8/9 BUY + pre-sale بدون رگرسیون
- self-test **15/15** + suite **100/100**

BATCH 11 بده یا PAUSE LOOP. Text-only. Deploy ممنوع.
