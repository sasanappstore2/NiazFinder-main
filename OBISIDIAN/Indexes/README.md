---
title: "نقشهٔ کامل Vault — Indexes"
tags: [index]
status: live
---

# نقشهٔ کامل Vault

این فایل نقطهٔ ورود سطح‌بالای «Engineering Brain» است — برای عضو جدید تیم یا هر ایجنت AI که برای اولین بار وارد این ریپو می‌شود.

## دو لایهٔ Vault

| لایه | پوشه‌ها | برای چی |
|------|---------|---------|
| **محصول/چرایی** (قدیمی، دست‌نخورده) | `00_Product_MOC/`, `10_Product_Areas/`, `03_Operations_Debug/`, `90_Technical_Appendix/`, `01_Features/` (stub), `00_Index/` (stub), `20_Cross_Links/` | چرا این فیچر وجود دارد، چه کسی از آن استفاده می‌کند، چه routeها/فایل‌هایی درگیرند |
| **Engineering Brain** (جدید، این پروژه) | `Architecture/`, `AI/`, `ADR/`, `RFC/`, `Playbooks/`, `Runbooks/`, `Debug/`, `Testing/`, `Product/`, `Roadmap/`, `Glossary/`, `Decision Logs/`, `Business Logic/`, `Features/`, `API/`, `Security/`, `Performance/`, `Research/` | چطور سیستم کار می‌کند، چرا این‌طور تصمیم گرفته شد، چطور دیباگ/تست/نگهداری کنیم |

لایهٔ جدید عمداً محتوای لایهٔ قدیمی را **کپی نمی‌کند** — فقط با لینک به آن ارجاع می‌دهد. `docs/` (۱۳۷ فایل، خارج از Vault) مرجع فنی تفصیلی اصلی است؛ اینجا هم فقط لینک می‌خوریم، کپی نمی‌کنیم.

## ترتیب خواندن پیشنهادی (برای عضو جدید یا ایجنت AI)

1. [[../AI/CLAUDE_CONTEXT|AI/CLAUDE_CONTEXT]] — چشم‌انداز پروژه، قوانین حیاتی، اولویت‌ها (شروع از اینجا)
2. [[../Architecture/README|Architecture/README]] — نقشهٔ سیستم در یک نگاه
3. [[../00_Product_MOC/ProductMap|00_Product_MOC/ProductMap]] — نقشهٔ محصول (چرایی فیچرها)
4. پوشهٔ دامنه‌ای مرتبط با کاری که می‌خواهید انجام دهید (مثلاً `Architecture/Backend/wallet-payments.md` برای کار روی کیف پول)
5. [[../ADR/README|ADR/README]] — چرا تصمیم‌های بزرگ معماری این‌طور گرفته شدند
6. [[../Playbooks/README|Playbooks/README]] یا [[../Debug/README|Debug/README]] — وقتی کاری عملیاتی/دیباگ دارید

## فهرست پوشه‌های سطح‌بالا

| پوشه | هدف |
|------|-----|
| [[../Architecture/README\|Architecture/]] | معماری سیستم به تفکیک Backend/Frontend/Database/AI/Infrastructure |
| [[../AI/README\|AI/]] | حافظهٔ ایجنت‌های AI — context، قوانین، واژه‌نامه |
| [[../ADR/README\|ADR/]] | تصمیم‌های معماری بزرگ (پذیرفته‌شده) |
| [[../RFC/README\|RFC/]] | پیشنهادهای سیستم‌های بزرگ آینده |
| [[../Playbooks/README\|Playbooks/]] | چک‌لیست‌ها و رویه‌های تکرارشونده |
| [[../Runbooks/README\|Runbooks/]] | رویه‌های عملیاتی (اجرا/دیپلوی) |
| [[../Debug/README\|Debug/]] | راهنمای دیباگ |
| [[../Testing/README\|Testing/]] | نقشهٔ خوشه‌های تست پروژه |
| [[../Business Logic/README\|Business Logic/]] | قوانین کسب‌وکاری غیر بدیهی |
| [[../Features/README\|Features/]] | hub سبک به `10_Product_Areas/` (فیچرهای محصول) |
| [[../API/README\|API/]] | نقشهٔ ۲۱۶ روت API به تفکیک ناحیه |
| [[../Security/README\|Security/]] | ملاحظات امنیتی |
| [[../Performance/README\|Performance/]] | ملاحظات کارایی |
| [[../Research/README\|Research/]] | یافته‌های تحقیقی/آزمایشی |
| [[../Product/README\|Product/]] | hub سبک به `00_Product_MOC/` |
| [[../Roadmap/README\|Roadmap/]] | نقشهٔ راه — لینک به `00_Product_MOC/Roadmap.md` و `10_Product_Areas/17_Monetization_Backlog.md` |
| [[../Glossary/README\|Glossary/]] | واژه‌نامهٔ دامنه |
| [[../Decision Logs/README\|Decision Logs/]] | تصمیم‌های عملیاتی کوچک‌تر (نه ADR) |
| `10_Product_Areas/` | ۱۷ سند فیچر محصول (لایهٔ قدیمی، دست‌نخورده) |
| `90_Technical_Appendix/` | کاتالوگ‌های فنی (Components/Lib/Prisma/API) (لایهٔ قدیمی، دست‌نخورده) |
| `03_Operations_Debug/` | Playbook/Checklist/Health قدیمی (لینک‌شده از `Playbooks/`, `Debug/`, `Testing/`) |

## گزارش‌های تحویل (Deliverables)

- [[Audit_Report|Audit_Report.md]]
- [[Migration_Summary|Migration_Summary.md]]
- [[Knowledge_Coverage_Report|Knowledge_Coverage_Report.md]]
- [[AI_Readiness_Report|AI_Readiness_Report.md]]
- [[Missing_Documentation_Report|Missing_Documentation_Report.md]]
- [[Future_Maintenance_Recommendations|Future_Maintenance_Recommendations.md]]
- [[Tag_Taxonomy|Tag_Taxonomy.md]]

> این گزارش‌ها در پایان فاز ۶ تکمیل می‌شوند.
