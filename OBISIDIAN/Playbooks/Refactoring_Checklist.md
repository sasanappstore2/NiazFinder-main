---
title: "Refactoring Checklist"
tags: [operations]
status: live
---

# چک‌لیست بازآرایی (Refactoring)

- [ ] آیا این بازآرایی واقعاً لازم است یا فقط ترجیح سلیقه‌ای؟ (طبق قانون کاربر: بدون over-engineering)
- [ ] وابستگی‌های بالادست/پایین‌دست بررسی شد؟ (مخصوصاً بین سیستم‌های AI مجزا — [[../Architecture/AI/README|Architecture/AI/]])
- [ ] اگر فایل/پوشهٔ مشکوکی حذف می‌شود (مثل یک بکاپ تاریخ‌دار)، دلیل و تأیید کاربر مستند شد؟
- [ ] تست‌های مرتبط قبل و بعد از تغییر اجرا شدند؟
- [ ] اگر الگوی کد تغییر کرد (مثلاً یک الگوی جدید env accessor)، آیا [[../AI/Coding_Standards|AI/Coding_Standards]] به‌روزرسانی نیاز دارد؟
- [ ] هیچ منطق دسترسی/RBAC به‌طور ناخواسته تغییر نکرده؟

## روابط
- [[Architecture_Checklist|Architecture_Checklist.md]]
