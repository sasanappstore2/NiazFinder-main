---
title: "Security"
tags: [security]
status: partial
---

# Security

## هدف
ملاحظات امنیتی سطح‌بالا — این پوشه جایگزین حسابرسی امنیتی مستقل نیست.

## آنچه از کد و اسناد موجود قابل استخراج بود
- کنترل دسترسی نقش‌محور: [[../Architecture/Backend/rbac-auth|Architecture/Backend/rbac-auth]] (`src/lib/rbac/`, `src/lib/auth/`)
- گزارش امنیتی/remediation موجود در ریشهٔ ریپو: `SECURITY_AUDIT_REPORT.md` (خارج از Vault — فقط لینک، نه کپی)
- اسکریپت‌های امنیتی: `security:inventory`, `test:security-smoke` (`package.json`)

## فرضیه (نیاز به تأیید)
جزئیات کامل threat-model یا OWASP checklist اختصاصی این پروژه در این جلسه استخراج نشد — این پوشه فعلاً یک اسکلت است، نه حسابرسی کامل.

## روابط
- استراتژی احراز هویت: [[../ADR/008-authentication-strategy|ADR/008-authentication-strategy]]

## ترتیب خواندن
`SECURITY_AUDIT_REPORT.md` (ریشهٔ ریپو) → `ADR/008-authentication-strategy` → `rbac-auth.md`.
