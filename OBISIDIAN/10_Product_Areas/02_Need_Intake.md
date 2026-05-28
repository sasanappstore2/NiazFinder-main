---
title: "ثبت نیاز (Need Intake)"
tags: [product-area]
status: live
---

# ثبت نیاز (Need Intake)

## یک خط

موتور ثبت هوشمند نیاز: از متن آزاد تا آگهی منتشرشده.

## برای چه کسی

کارفرما

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/post` | جریان اصلی |
| `?seed=&city=&phone=` | پیش‌پر از خانه |

## چه کار می‌کند

- parse-intent قوانین‌محور
- سؤالات ساختاریافته
- چت تکمیلی
- پیش‌نمایش آگهی
- publish

## منطق و قوانین

- بدون LLM روی هر keystroke (typing rules)
- moderation پس از publish
- شهر/دسته از parse

## ویژگی‌های فعلی

- [x] RealtimeNeedInput
- [x] IntakeStepTimeline
- [x] NeedListingPreview
- [x] typing hints
- [x] نمایش اعتماد تشخیص (CategoryConfidenceBadge)
- [x] آزمایشگاه dev روی `/post` (IntakeLab — فقط development)
- [x] دیتاست ۵۹+ کیس + export JSONL
- [x] میکروسرویس MLX (`mini-services/intake-mlx`) — infer + LoRA train لوکال
- [x] parse هیبرید (`NEED_INTAKE_LLM_ENABLED` + fallback قوانین)

## ارتباط با بخش‌های دیگر

[[01_Home_Landing]]
[[03_Need_Marketplace]]
[[06_Matching_Leads]]
[[15_Admin_SuperAdmin]]

## ایده‌ها / آینده

- [ ] #idea پیش‌نویس ذخیره در localStorage
- [ ] #idea ضمیمه عکس در intake
- [ ] فاین‌تیون LoRA روی مک و ارزیابی دقت بعد از train
- [ ] Unsloth روی GPU (جایگزین اختیاری برای غیر-Mac)

## پیاده‌سازی

- [[../../docs/NEED_INTAKE.md|docs/NEED_INTAKE.md]]
- [[../../docs/NEED_INTAKE_ML.md|docs/NEED_INTAKE_ML.md]]
- [[../../docs/TYPING_ANALYSIS.md|docs/TYPING_ANALYSIS.md]]
- `src/components/need-intake/`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
