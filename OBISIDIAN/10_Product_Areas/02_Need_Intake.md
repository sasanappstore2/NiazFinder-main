---
title: "ثبت نیاز (Need Intake)"
tags: [product-area]
status: live
---

# ثبت نیاز (Need Intake)

## یک خط

موتور ثبت هوشمند نیاز: از متن آزاد تا آگهی منتشرشده — مسیر کاننیکال **`/post`**.

## برای چه کسی

کارفرما (CLIENT)

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/post` | wizard چهار مرحله (کاننیکال) |
| `?seed=&city=&category=&phone=` | پیش‌پر از خانه |
| `/v2` | redirect → `/post` (منسوخ) |

## جریان فعلی (۲۰۲۶-۰۶)

1. **need** — متن نیاز (+ seed از خانه)
2. **details** — جزئیات اگر لازم
3. **location** — دسته، شهر، محله، پین (املاک)
4. **preview** — عنوان + توضیح (AI stream)
5. **publish** — `ServiceRequest` + moderation

~~چت تکمیلی~~ و ~~سؤال‌وجواب conversational~~ **حذف از محصول** (فاز ۳ کد).

## مستندات فنی (منبع حقیقت)

| سند | محتوا |
|-----|--------|
| [docs/INTAKE_INDEX.md](../../docs/INTAKE_INDEX.md) | ایندکس مرکزی |
| [docs/NEED_INTAKE.md](../../docs/NEED_INTAKE.md) | معماری + API |
| [docs/INTAKE_EXECUTION.md](../../docs/INTAKE_EXECUTION.md) | برنامه ۵۰ فاز |
| [docs/INTAKE_NEED_DRAFT.md](../../docs/INTAKE_NEED_DRAFT.md) | قرارداد داده |

## منطق و قوانین

- **Rules-First, AI-Enhance** — ADR-001
- Publish gate: `validateNeedDraftForPublish` (نه completionState)
- املاک: پین نقشه الزامی
- moderation پس از publish (مگر auto-approve در dev)

## ویژگی‌های فعلی

- [x] Wizard `/post` — `NeedIntakePanel`
- [x] Analyze hybrid (MLX + rules)
- [x] Listing copy stream
- [x] Resume publish بعد از login (sessionStorage)
- [x] Golden tests 153+ scenarios
- [ ] Unified validation UX (فاز ۱۶)
- [ ] Mobile fullscreen stepper (فاز ۲۶)

## Technical Appendix

- Component: `src/components/need-intake/NeedIntakePanel.tsx`
- Store: `src/stores/need-intake-store.ts`
- Canonical: `src/intake/`
- MLX: `mini-services/intake-mlx/`

## ارتباط با بخش‌ها

- [[Browse_Needs]] — آگهی منتشرشده در `/n/*`
- [[Home]] — seed از `HomeLeadLanding`
- [[Moderation]] — صف پس از publish
