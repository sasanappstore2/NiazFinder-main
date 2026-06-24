---
name: niazfinder-intake
description: >
  ایجنت هوشمند intake برای نیازفایندر. متن فارسی نیاز کاربر را می‌خواند،
  دسته‌بندی و موقعیت مکانی را تشخیص می‌دهد، تمام فیلدهای فرم را پر می‌کند
  و در صورت نقص اطلاعات، سؤال تکمیلی می‌پرسد.
  triggers: intake, need, نیاز, فرم, form, parse, category, دسته‌بندی, parse-intent
---

# NiazFinder Intake Agent — Skill

## هسته کارکرد

این skill زمانی فعال می‌شود که کاربر در صفحه `/post` متن نیاز خود را وارد کند.
وظیفه agent: خواندن متن → تشخیص intent → پر کردن تمام فیلدهای intake → بازگرداندن JSON ساختاریافته.

## جریان کار (Workflow)

### ۱. دریافت متن نیاز

کاربر متن فارسی نیاز خود را در فرم intake می‌نویسد. مثال:

> «آپارتمان ۷۰ متری دو خواب در سعادت‌آباد تهران، رهن کامل ۵۰۰ میلیون»

### ۲. تحلیل و استخراج

Agent باید متن را تحلیل کند و این موارد را استخراج کند:

1. **vertical** — دسته اصلی (real-estate, vehicles, electronics, home-appliances, services, personal-items, entertainment, social, jobs)
2. **categorySlug / subcategorySlug** — از فهرست مجاز دسته‌بندی‌ها (فایل `categories.json`)
3. **transactionType** — نوع معامله (BUY, RENT, FULL_DEPOSIT, DEPOSIT_AND_RENT, DAILY_RENT, HOURLY_RENT, SELL)
4. **city / citySlug / province** — شهر و استان
5. **neighborhood / neighborhoodSlug** — محله (از فهرست محله‌های شهر انتخابی)
6. **فیلدهای عددی** — area, rooms, budgetMin, budgetMax, rahnAmount, monthlyRent, deposit, floorMin, yearMin
7. **propertyKind** — نوع ملک (apartment, villa, land, shop, office, industrial)
8. **summary** — خلاصه یک‌جمله‌ای نیاز

### ۳. اعتبارسنجی

پس از استخراج، مقادیر باید اعتبارسنجی شوند:
- **categorySlug** باید در فهرست `categories.json` موجود باشد
- **citySlug** باید در فهرست `cities.json` موجود باشد
- **neighborhoodSlug** باید در فهرست محله‌های آن شهر موجود باشد
- اعداد باید معقول باشند (مثلاً area > 0, rooms >= 0)

### ۴. شناسایی نقص (Gap Detection)

اگر فیلد ضروری‌ای در متن نبود، agent باید آن را در `missingInfo` لیست کند.
فیلدهای ضروری به ازاء هر vertical متفاوت است:
- **real-estate**: transactionType, city, area (حداقل یکی از budget/rahn/rent)
- **vehicles**: transactionType, city
- **services**: city
- **دیگر**: city

### ۵. خروجی JSON

Agent باید این JSON را برگرداند:

```json
{
  "vertical": "real-estate",
  "categorySlug": "residential-rent",
  "subcategorySlug": "apartment-rent",
  "transactionType": "FULL_DEPOSIT",
  "dealType": "rent_rahn_full",
  "city": "تهران",
  "citySlug": "tehran",
  "province": "تهران",
  "neighborhood": "سعادت‌آباد",
  "neighborhoodSlug": "saadat-abad",
  "area": 70,
  "rooms": 2,
  "budgetMin": null,
  "budgetMax": null,
  "rahnAmount": 500000000,
  "monthlyRent": null,
  "deposit": null,
  "propertyKind": "apartment",
  "floorMin": null,
  "yearMin": null,
  "summary": "آپارتمان ۷۰ متری دو خواب در سعادت‌آباد با رهن کامل ۵۰۰ میلیون تومان",
  "confidence": 0.9,
  "missingInfo": []
}
```

## فایل‌های مرجع

| فایل | محتوا |
|------|-------|
| `categories.json` | فهرست کامل دسته‌بندی‌های مجاز (slug + عنوان فارسی + والد) |
| `cities.json` | فهرست شهرهای ایران (slug + نام + استان) |
| `intake-fields.json` | تعریف تمام فیلدهای intake با نوع و مقادیر مجاز |
| `system-prompt.md` | پرامپت سیستم کامل برای مدل LLM |
| `prompt-template.md` | قالب پرامپت کاربر با placeholder ها |
| `examples.json` | نمونه‌های ورودی/خروجی برای آموزش و تست |
| `vertical-schemas.json` | فیلدهای مورد انتظار به ازاء هر vertical |

## پیکربندی مدل

- **مدل:** Gemma 4 E2B (gemma-4-e2b-q4_0-it)
- **API:** OpenAI-compatible (`/v1/chat/completions`)
- **Endpoint:** `http://127.0.0.1:8100` (سرویس gemma4-intake)
- **Temperature:** 0.1
- **Max tokens:** 1024
- **Timeout:** 30 ثانیه

## نکات مهم

1. **فقط JSON برگردان** — بدون markdown، بدون توضیح اضافه
2. **slugها فقط از فهرست مجاز** — هرگز slug جدید نساز
3. **شهر/محله را همان‌طور که کاربر نوشته** برگردان — اعتبارسنجی بعداً انجام می‌شود
4. **اگر فیلدی در متن نبود** — `null` بگذار، حدس نزن
5. **اعداد را به عدد تبدیل کن** — «پنجصد میلیون» → 500000000
6. **transactionType مقادیر مجاز:** BUY, RENT, FULL_DEPOSIT, DEPOSIT_AND_RENT, DAILY_RENT, HOURLY_RENT, SELL
7. **propertyKind مقادیر مجاز:** apartment, villa, land, shop, office, industrial
8. **متن‌های فارسی را عادی‌سازی کن** — ی/ی، ک/ک، اعداد فارسی/عربی → انگلیسی
