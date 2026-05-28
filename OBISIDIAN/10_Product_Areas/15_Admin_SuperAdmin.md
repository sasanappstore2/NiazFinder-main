---
title: "ادمین و Super Admin"
tags: [product-area]
status: live
---

# ادمین و Super Admin

## یک خط

مدیریت پلتفرم: moderation، کاربران، دسته، مکان، چت‌ریویو.

## برای چه کسی

ادمین

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/super-admin` | پنل |
| `/admin` | ادمین قدیمی |

## چه کار می‌کند

- صف moderation نیاز
- RBAC
- آمار
- chat review

## منطق و قوانین

- StaffPermission در DB
- audit log
- bulk moderate

## ویژگی‌های فعلی

- [x] RequestsPanel
- [x] CategoriesLocations
- [x] RBAC UI

## ارتباط با بخش‌های دیگر

[[02_Need_Intake]]
[[03_Need_Marketplace]]
[[07_Communication_Chat]]

## ایده‌ها / آینده

- [ ] #idea داشبورد KPI روزانه
- [ ] #idea auto-moderation ML

## پیاده‌سازی

- `src/app/api/super-admin/`
- `src/config/admin-permissions.ts`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
