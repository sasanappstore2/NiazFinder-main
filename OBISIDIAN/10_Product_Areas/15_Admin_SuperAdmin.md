---
title: "ادمین و Super Admin"
tags: [product-area]
status: live
---

# ادمین و Super Admin

## یک خط

مرکز کنترل عملیاتی پلتفرم: moderation، CRM، بازار، ارتباطات، مالی و ops.

## برای چه کسی

سوپرادمین (مالک) و کارمندان با StaffRole/RBAC

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/super-admin` | پنل اصلی (Nellavio) |
| `/super-admin/analytics` | Analytics Hub (ترافیک first-party + KPI عملیاتی) |
| `/super-admin/workflow` | صف‌های کاری یکپارچه |
| `/super-admin/users` | CRM کاربران |
| `/super-admin/reports` | گزارش تخلف |
| `/super-admin/businesses` | moderation کسب‌وکار |
| `/super-admin/proposals` | moderation پیشنهاد |
| `/super-admin/outreach` | Need Lead Outreach |
| `/super-admin/messages` | بازبینی چت |
| `/super-admin/voice-calls` | مانیتoring تماس |
| `/super-admin/audit` | Audit log |
| `/super-admin/billing` | تراکنش‌ها |
| `/super-admin/settings` | تنظیمات سیستم |
| `/super-admin/categories` | دسته‌بندی نیازها (taxonomy آگهی) |
| `/super-admin/business-occupations` | دسته‌بندی کسب‌وکار (شغل/حرفه) |
| `/super-admin/online-stores` | فروشگاه‌های اینترنتی (حوزه محصول) |
| `/admin` | redirect → `/super-admin` (legacy) |

## چه کار می‌کند

- صف moderation نیاز (RequestsModerationHub)
- RBAC کارمندان
- CRM: ban/verify/role + staff assignment
- Businesses/Proposals/Reports moderation
- Chat review + hide message
- Outreach dispatch
- Audit log viewer
- Analytics Hub (Realtime, Acquisition, Engagement, Geo, Technology, Business, Platform)
- First-party pageview/event collection — [`docs/ANALYTICS.md`](../../docs/ANALYTICS.md)
- System settings (feature flags)

## منطق و قوانین

- `StaffPermission` در DB — [`admin-permissions.ts`](../../src/config/admin-permissions.ts)
- `requirePermission` در همه APIهای `/api/super-admin/*`
- `logAdminAction` برای mutations
- Owner phone = full access (`*`)

## ویژگی‌های فعلی

- [x] RequestsPanel + moderation queue
- [x] CategoriesLocations
- [x] Business occupations admin (JSON registry + `/api/super-admin/business-occupations`)
- [x] RBAC UI
- [x] UsersPanel (CRM actions)
- [x] BusinessesPanel (BusinessProfile admin API)
- [x] ProposalsPanel
- [x] ReportsPanel
- [x] Chat moderation (hide)
- [x] VoiceCalls, Notifications, Reviews
- [x] Outreach, NeedAlerts
- [x] Billing, Files, Audit
- [x] Analytics Hub (GA-like traffic + Platform tab)
- [x] Referrals/Coupons (read-only)
- [x] System settings

## E2E

```bash
npx tsx scripts/test-super-admin-e2e.ts http://localhost:3000
npx tsx scripts/test-analytics-collect-e2e.ts http://localhost:3000
npx tsx scripts/analytics/rollup-daily.ts
```

## پیاده‌سازی

- `src/app/api/super-admin/`
- `src/components/admin/modules/`
- `src/config/super-admin-nav.ts`

## پیاده‌سازی فنی (فایل‌ها و مسیرها)

*(merge شده از `01_Features/AdminModeration.md`)*

| نوع | مسیر |
|-----|------|
| Permissions config | `src/config/admin-permissions.ts` |
| صف moderation | `src/lib/request-moderation/enqueue.ts`, `rules.ts` — internal route: `src/app/api/internal/request-moderation/route.ts` |
| API گروه super-admin | `super-admin/requests/**`, `super-admin/rbac/**`, `super-admin/chat-review/**`, users/categories/locations/analytics |
| Nest | `RequestModerationProcessor` — ماژول‌های `admin`, `internal` (legacy، فقط ۳ ماژول intake-* هنوز load-bearing‌اند) |
| Prisma | `ModerationStatus`, `AdminAuditLog`, `StaffRole` |

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
- [[02_Need_Intake]] (publish → صف moderation)
- [[../03_Operations_Debug/E2EChecklist|E2EChecklist]]
