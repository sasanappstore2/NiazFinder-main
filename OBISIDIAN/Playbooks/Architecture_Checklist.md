---
title: "Architecture Checklist"
tags: [operations, architecture]
status: live
---

# چک‌لیست معماری

قبل از هر تغییر معماری قابل‌توجه:

- [ ] آیا این تغییر با اصول [[../AI/Architectural_Principles|AI/Architectural_Principles]] سازگار است؟
- [ ] آیا سیستم AI درستی درگیر است؟ (چهار سیستم مجزا — [[../Architecture/AI/README|Architecture/AI/]])
- [ ] آیا `/post` (موتور intake) لمس می‌شود؟ اگر بله، آیا کاربر صراحتاً تأیید کرده؟
- [ ] اگر عملیات پولی جدید است: آیا الگوی idempotent lock-check رعایت شده؟
- [ ] آیا این تغییر مستلزم schema migration است؟ اگر بله، `prisma migrate status` قبل از هر اقدام چک شده؟
- [ ] آیا این تصمیم بزرگ کافی برای یک ADR جدید است؟

## روابط
- [[../ADR/README|ADR/]]
- [[Documentation_Checklist|Documentation_Checklist.md]]
