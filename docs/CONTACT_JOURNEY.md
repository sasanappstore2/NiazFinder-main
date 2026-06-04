# سفر تماس با کسب‌وکار (مخاطبین تیم)

## خلاصه

مشتری قبل از شروع چت یا تماس، **بخش تماس** کسب‌وکار را انتخاب می‌کند (مثلاً فروش، پشتیبانی). هر بخش به یک **کاربر واقعی** (عضو تیم) منتسب است. گفتگوها و اعلان‌ها به همان فرد می‌رسد.

## جریان مشتری

1. کلیک «پیام» یا «چت» از مرور کسب‌وکار، پروفایل، یا صفحه محصول
2. درخواست `GET /api/business/slug/{slug}/contact-points`
3. **۰ مخاطب** → toast «چت غیرفعال»
4. **۱ مخاطب** → شروع مستقیم گفتگو با `assignedUserId` + `contactPointId`
5. **۲+ مخاطب** → باز شدن `BusinessContactPickerSheet`
6. پس از انتخاب → `POST /api/chat` با dedupe روی `(userId1, userId2, requestId, contactPointId)`
7. هدر thread: «{بخش} · {نام کسب‌وکار}»

## جریان مالک / مدیر

1. `/my-business` → تب **مخاطبین و تیم**
2. دعوت کارمند با شماره موبایل (`POST /api/business/me/team`)
3. ساخت مخاطب (`POST /api/business/me/contact-points`) و انتساب عضو ACTIVE
4. publish / chat toggle per contact

## جریان کارمند

1. دعوت با موبایل → پس از login/register، `acceptBusinessInvitesForUser` عضو ACTIVE می‌سازد
2. پیام‌های مشتری در inbox شخصی کارمند (`/chat`) — assignee همان `assignedUserId` است
3. کارمند به پنل vitrine/brand دسترسی مدیریتی ندارد (فقط مالک/مدیر)

## APIهای کلیدی

| مسیر | نقش |
|------|-----|
| `GET /api/business/slug/[slug]/contact-points` | عمومی |
| `GET/POST /api/business/me/contact-points` | مالک/مدیر |
| `PATCH/DELETE /api/business/me/contact-points/[id]` | مالک/مدیر |
| `GET/POST /api/business/me/team` | لیست / دعوت |
| `PATCH /api/business/me/team/[userId]` | حذف / تغییر نقش |
| `POST /api/business/me/team/invite/accept` | پذیرش دستی دعوت |

## مهاجرت اولیه

برای هر `BusinessProfile` موجود:
- `BusinessMember(OWNER)` برای `userId` مالک
- `BusinessContactPoint` پیش‌فرض «مدیریت» → assignee = مالik

## تست دستی

1. مالک: دعوت ۲ کارمند → پذیرش → مخاطب «فروش» و «پشتیبانی»
2. مشتری از browse: picker → چت فروش → هدر درست
3. همان مشتری: چت پشتیبانی → thread جدا
4. حذف staff → مخاطب unpublish
5. تماس صوتی پس از گفتگو با assignee
