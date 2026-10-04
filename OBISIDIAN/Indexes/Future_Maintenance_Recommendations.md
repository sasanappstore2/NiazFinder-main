---
title: "Future Maintenance Recommendations"
tags: [index]
status: live
---

# Future Maintenance Recommendations

## دوره‌ای (طبق [[../Playbooks/Knowledge_Checklist|Playbooks/Knowledge_Checklist]])
هر چند ماه یک‌بار: بررسی لینک شکسته، orphan جدید، تگ‌های خارج از taxonomy، staleness محتوای `Architecture/` در برابر کد واقعی.

## بعد از هر جلسهٔ کاری بزرگ
- `AI/Agent_Memory.md` را با مشاهدات جدید به‌روزرسانی کنید.
- اگر قانون/محدودیت جدیدی کشف شد، به `AI/Engineering_Constitution.md` یا `AI/System_Constraints.md` اضافه کنید (همان روز، نه بعداً).
- اگر تصمیم بزرگ معماری گرفته شد، ADR بنویسید؛ اگر کوچک بود، Decision Log.

## گسترش پوشش (طبق [[Missing_Documentation_Report|Missing_Documentation_Report.md]])
اولویت بعدی: سند معماری برای `src/lib/need-intake/` و `src/lib/filing/`.

## حل سؤالات باز
پنج سؤال فهرست‌شده در [[Missing_Documentation_Report|Missing_Documentation_Report.md]] (به‌ویژه وضعیت `chat-go`) باید با تیم مطرح شوند — این‌ها بلاک‌کنندهٔ تبدیل [[../ADR/010-websocket-realtime-strategy|ADR-010]] از proposed به accepted هستند.

## قانون بنیادین که نباید فراموش شود
لینک بده، کپی نکن — هم برای `docs/` هم برای کد سورس. اگر در آینده وسوسه شدید محتوای `docs/` را داخل این Vault بازنویسی کنید (برای «کامل‌تر» به نظر رسیدن)، این همان اشتباهی است که باعث drift اولیهٔ این Vault شد — به آن برنگردید.

## روابط
- [[../AI/AI_Collaboration_Guide|AI/AI_Collaboration_Guide]]
