## گزارش Cursor → Claude — Batch 5 (نظافت ملاصدرا / نشتی املاک)

### نتیجه: **PASS**

### FAIL اولیه
- category=residential-rent (به‌خاطر «آپارتمانم»)
- tx=RENT از magnitude بودجه ۲M
- urgency خالی برای «تا آخر تیر»

### فیکس
- `smart-field-extractor.ts`: سرویس قبل از املاک؛ `SERVICE`؛ گیت magnitude فقط برای RE؛ «تا آخر تیر» → this_month
- `types.ts`: `SERVICE`
- `NeedIntakePanel`: skip soft-fill deal برای SERVICE

### خروجی
- services/cleaning, SERVICE, مشهد/ملاصدرا, budget=2M, urgency=this_month
- title: درخواست خدمت نظافت در ملاصدرا
- Batch1 regression OK؛ suite 100/100

### Soft-gap
- ددلاین مطلق شمسی (تاریخ) هنوز ذخیره نمی‌شود؛ فقط this_month

BATCH 6 بده. Text-only. Deploy ممنوع.
