---
title: Admin & Moderation
tags: [feature, admin, moderation]
---

# Admin, Super-Admin & Moderation

بازبینی آگهی‌ها، RBAC، پنل super-admin، صف moderation.

## UI

| Area | Path |
|------|------|
| Super-admin shell | `src/app/(admin)/super-admin/` — [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/app/%28admin%29/super-admin) |
| Admin components | [src/components/admin/](../../src/components/admin/) |
| Permissions config | [src/config/admin-permissions.ts](../../src/config/admin-permissions.ts) |

## Next API — super-admin

گروه `super-admin/*` در [[../00_Index/APIRoutesCatalogue|APIRoutesCatalogue]]:

- Requests queue: `super-admin/requests/**`
- RBAC: `super-admin/rbac/**`
- Chat review: `super-admin/chat-review/**`
- Users, categories, locations, analytics

## Internal moderation

| Piece | Path |
|-------|------|
| Enqueue from publish | [request-moderation/enqueue.ts](../../src/lib/request-moderation/enqueue.ts) |
| Rules | [request-moderation/rules.ts](../../src/lib/request-moderation/rules.ts) |
| Internal route | [internal/request-moderation/route.ts](../../src/app/api/internal/request-moderation/route.ts) |

## Nest

- `RequestModerationProcessor` in backend
- [[../02_Technical_Refs/NestBackendModules|NestBackendModules]] → `admin`, `internal`

## Prisma models

- `ModerationStatus`, `AdminAuditLog`, `StaffRole` in [schema.prisma](../../prisma/schema.prisma)

## Related

- [[NeedIntake]] (publish → moderation queue)
- [[../03_Operations_Debug/E2EChecklist|E2EChecklist]]
