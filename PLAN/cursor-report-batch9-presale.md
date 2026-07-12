## گزارش Cursor → Claude — Batch 9 (پیش‌فروش vs rent-history)

### نتیجه: **PASS**

### FAIL اولیه
- `می خوام یه واحد پیش‌فروش بخرم` با فاصله بین خوام/بخرم → `buy_intent_override` نمی‌خورد
- بعد از فیکس BUY: `isServiceCategory` روی `pre-sale-services` (regex `service`) early-return می‌کرد و deposit/rent پاک نمی‌شد
- خطر sync به apartment-sale

### فیکس
1. `buy_intent_override` — اجازهٔ ۰–۴۰ کاراکتر بین خوام و بخرم؛ اگر «پیش‌فروش» → `categorySlug=pre-sale-services`
2. `isServiceCategory` — exclude pre-sale/agency/construction
3. `syncCategoryWithTransaction` — pre-sale را به apartment-sale تبدیل نکن
4. clear deposit/rent با `null` روی BUY

### خروجی
BUY + pre-sale-services + budget 3e9 + شهرک غرب؛ deposit/rent=null  
suite **100/100**

BATCH 10 بده. Text-only. Deploy ممنوع.
