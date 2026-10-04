---
title: "ADR-005: Remove Conversational Intake V2"
tags: [adr]
status: accepted
---

# ADR-005: حذف Intake V2 مکالمه‌ای — `/post` فرم-محور canonical

**وضعیت**: پذیرفته‌شده · **دامنه**: Intake V2 مکالمه‌ای (chat UI، orchestrator، API) · **جایگزینِ**: ریدایرکت منجمد `/v2` + API `intake-chat` با 503

## خلاصه
Intake V2 یک لایهٔ چت مکالمه‌ای بود (`IntakeChatV2`, `orchestrateIntakeV2Turn`) روی همان schemaهای `NeedDraft` و category-filter که `/post` استفاده می‌کند. پیش‌تر منجمد شده بود: `/v2` به `/post` ریدایرکت می‌شد و `POST /api/v2/intake-chat` مقدار 503 برمی‌گرداند. تصمیم: حذف کامل کد مرده به‌جای نگه‌داشتن حالت منجمد.

## منبع کامل
[docs/adr/005-remove-intake-v2-chat.md](../../docs/adr/005-remove-intake-v2-chat.md)

## روابط
- [[004b-post-manual-wizard|ADR-004b]] (جایگزین شد با ویزارد دستی)
