---
title: "ADR-010: WebSocket / Realtime Strategy"
tags: [adr, chat]
status: proposed
---

# ADR-010: WebSocket / Realtime Strategy

> ⚠️ **این ADR بر پایهٔ observation کد در تاریخ ۲۰۲۶-۰۷-۱۶ نوشته شده، نه تاریخچهٔ واقعی مستندشدهٔ تصمیم‌گیری. وضعیت این ADR «proposed» است نه «accepted» چون یک ابهام واقعی حل‌نشده در آن هست (پایین را ببینید).**

**وضعیت**: پیشنهادی — نیاز به تأیید تیم

## Context
چت realtime، typing indicator، و تماس صوتی WebRTC نیاز به یک لایهٔ WebSocket پایدار دارند. طی بررسی این جلسه، **دو پیاده‌سازی موازی چت کشف شد**: `mini-services/chat-service/` (Bun + Socket.io، طبق CLAUDE.md سرویس رسمی `default` profile) و `mini-services/chat-go/` (Go، ساختار کامل `cmd/chat`, `internal/{auth,config,hub,protocol,server,store,ws}` دارد اما در CLAUDE.md ذکر نشده).

## Decision
**در انتظار تأیید کاربر/تیم.** فرض فعلی مستند: `chat-service` (Bun/Socket.io) سرویس زندهٔ اصلی است طبق CLAUDE.md؛ `chat-go` یا (الف) جایگزین در حال توسعه برای مهاجرت آینده، یا (ب) آزمایش کنارگذاشته‌شده است. **این تصمیم نباید بدون تأیید صریح تیم قطعی فرض شود.**

## Alternatives (اگر tie-break لازم باشد)
- **ادامه با Socket.io (Bun)**: DX بالاتر، اکوسیستم بالغ‌تر، ولی throughput پایین‌تر از پیاده‌سازی native Go تحت بار سنگین.
- **مهاجرت کامل به `chat-go`**: کارایی/مصرف حافظهٔ بهتر برای اتصالات همزمان زیاد، هزینهٔ بازنویسی/تست دوباره.
- **نگه‌داشتن هر دو موقت با feature flag**: انعطاف برای مهاجرت تدریجی، پیچیدگی عملیاتی دوبرابر تا زمان جمع‌بندی.

## Consequences
تا زمان تأیید، هر تغییر در منطق چت باید به هر دو سرویس اعمال یا آگاهانه فقط به یکی محدود شود — در غیر این صورت رفتار production غیرقطعی می‌شود.

## Trade-offs
نامشخص تا شفاف‌سازی.

## Future considerations
**اکشن مورد نیاز**: کاربر/تیم باید مشخص کند `chat-go` چیست — این خودش پیش‌نیاز تبدیل این ADR از «proposed» به «accepted» است.

## روابط
- [[../Architecture/Backend/chat-communication|Architecture/Backend/chat-communication]]
