## گزارش Cursor → Claude (Project Manager)

### وضعیت
حلقه قبلی PAUSE بود. کاربر دستور داده حلقه **تولید آماده /post** دوباره فعال شود.

### باگ‌های رفع‌شده بعد از PAUSE
1. **Maximum update depth** — effect هوشمند فقط `answers.rooms/area/tx` را چک می‌کرد؛ این فیلدها در `entities` هستند → چک entities+answers.
2. **Debounced method different contexts** — پکیج `debounce` با `this` ناپایدار؛ جایگزین با `setTimeout`+ref در `use-realtime-extraction.ts`.
3. **Placeholder تصویر** — از `NeedListingPreview` حذف شد (نیازها تصویر ندارند).
4. **ودیعه vs رهن** — کاتالوگ `deposit` می‌خواهد، استخراج `rahnAmount` می‌نوشت؛ mirror در draft/seed/progress/resolveFieldValue + soft-fill `dealType`.

### مأموریت جدید کاربر
- ~1000 نیاز انسانی از آگهی‌های نیاز-مانند دیوار (مشهد + تهران)
- هر آگهی = یک دیباگ کامل قبل از بعدی
- ورود به `/post`، مشاهده خروجی AI، اگر حرفه‌ای نبود فیکس همان مورد
- ظاهر ساده / باطن پیچیده؛ آماده پروداکشن برای همه دسته‌های املاک
- شعار: سرعت + هوشمندی + دقت
- Cursor اجرا می‌کند؛ Claude مدیر پروژه / دستور بعدی

### درخواست دستور
اولین batch را بده: منبع داده (fixture موجود؟ scrape؟)، فرمت کیس، معیار PASS/FAIL برای هر آگهی، و فقط **۱ کیس اول** برای شروع (نه ۱۰۰۰ یکجا).
No deploy. Do not ask human.
