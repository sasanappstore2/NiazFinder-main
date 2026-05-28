export type AdminPermissionId =
  // ─── Super Admin Core ────────────────────────────────────────────────
  | 'superadmin:access'
  | 'superadmin:overview:read'
  | 'superadmin:analytics:read'
  // ─── Taxonomy ───────────────────────────────────────────────────────
  | 'taxonomy:categories:read'
  | 'taxonomy:categories:write'
  // ─── Geo / Locations ────────────────────────────────────────────────
  | 'geo:locations:read'
  | 'geo:locations:write'
  // ─── Users / CRM ────────────────────────────────────────────────────
  | 'crm:users:read'
  | 'crm:users:write'
  | 'crm:users:roles:write'
  // ─── Marketplace / Requests ─────────────────────────────────────────
  | 'market:requests:read'
  | 'market:requests:write'
  | 'market:requests:moderate'
  | 'market:proposals:read'
  | 'market:proposals:moderate'
  // ─── Businesses ─────────────────────────────────────────────────────
  | 'market:businesses:read'
  | 'market:businesses:write'
  | 'market:businesses:moderate'
  // ─── Reviews / Content ──────────────────────────────────────────────
  | 'content:reviews:read'
  | 'content:reviews:moderate'
  // ─── Chat / Communications ──────────────────────────────────────────
  | 'comms:messages:read'
  | 'comms:messages:moderate'
  | 'comms:notifications:read'
  | 'comms:notifications:write'
  // ─── Billing ────────────────────────────────────────────────────────
  | 'billing:transactions:read'
  | 'billing:transactions:write'
  // ─── System / Ops ───────────────────────────────────────────────────
  | 'ops:files:read'
  | 'ops:workflow:read'
  | 'ops:settings:write'
  | 'ops:system:write'
  | 'ops:intake-migration:read'
  | 'ops:intake-training:read'
  | 'ops:intake-training:write'
  // ─── Staff / RBAC ───────────────────────────────────────────────────
  | 'rbac:roles:read'
  | 'rbac:roles:write'
  | 'rbac:assignments:write'
  // ─── Audit ──────────────────────────────────────────────────────────
  | 'audit:read';

export type AdminPermission = {
  id: AdminPermissionId;
  label: string;
  description?: string;
  group:
    | 'Core'
    | 'Taxonomy'
    | 'Geo'
    | 'CRM'
    | 'Marketplace'
    | 'Businesses'
    | 'Content'
    | 'Communications'
    | 'Billing'
    | 'Ops'
    | 'RBAC'
    | 'Audit';
};

/**
 * Single source of truth for staff permission checkboxes.
 *
 * Notes (inventory-mapping):
 * - Current codebase has working APIs only for:
 *   - /api/super-admin/overview (read)
 *   - /api/super-admin/analytics (read)
 *   - /api/super-admin/categories (read/create)
 *   - /api/super-admin/categories/[id] (update/delete-or-deactivate)
 *   - /api/super-admin/locations (read/write)
 * - Current UI `SuperAdminDashboard` contains many sections (billing/files/workflow/...) that
 *   are mostly “dashboard shells” and not yet backed by dedicated admin APIs.
 * - “Chat review” requested by you will map to `comms:messages:*` and needs dedicated admin endpoints.
 */
export const ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  { id: 'superadmin:access', label: 'دسترسی به پنل سوپرادمین', group: 'Core' },
  { id: 'superadmin:overview:read', label: 'مشاهده داشبورد و آمار کلی', group: 'Core' },
  { id: 'superadmin:analytics:read', label: 'مشاهده تحلیل‌ها و نمودارها', group: 'Core' },

  { id: 'taxonomy:categories:read', label: 'مشاهده دسته‌بندی‌ها', group: 'Taxonomy' },
  { id: 'taxonomy:categories:write', label: 'ساخت/ویرایش/غیرفعال‌سازی دسته‌بندی‌ها', group: 'Taxonomy' },

  { id: 'geo:locations:read', label: 'مشاهده استان/شهر/محله', group: 'Geo' },
  { id: 'geo:locations:write', label: 'ساخت/ویرایش/حذف استان/شهر/محله', group: 'Geo' },

  { id: 'crm:users:read', label: 'مشاهده کاربران و وضعیت حساب‌ها', group: 'CRM' },
  { id: 'crm:users:write', label: 'ویرایش کاربران (فعال/مسدود/تأیید)', group: 'CRM' },
  { id: 'crm:users:roles:write', label: 'تغییر نقش‌های سطح سیستم (ADMIN/...)', group: 'CRM' },

  { id: 'market:requests:read', label: 'مشاهده نیازها (درخواست‌ها)', group: 'Marketplace' },
  { id: 'market:requests:write', label: 'ویرایش نیازها (وضعیت/اولویت/اطلاعات)', group: 'Marketplace' },
  { id: 'market:requests:moderate', label: 'بازبینی و اقدام روی نیازها (moderation)', group: 'Marketplace' },
  { id: 'market:proposals:read', label: 'مشاهده پیشنهادها', group: 'Marketplace' },
  { id: 'market:proposals:moderate', label: 'اقدام مدیریتی روی پیشنهادها', group: 'Marketplace' },

  { id: 'market:businesses:read', label: 'مشاهده کسب‌وکارها', group: 'Businesses' },
  { id: 'market:businesses:write', label: 'ویرایش کسب‌وکارها', group: 'Businesses' },
  { id: 'market:businesses:moderate', label: 'بازبینی/اقدام روی کسب‌وکارها', group: 'Businesses' },

  { id: 'content:reviews:read', label: 'مشاهده نظرات و امتیازها', group: 'Content' },
  { id: 'content:reviews:moderate', label: 'بازبینی/حذف/اقدام روی نظرات', group: 'Content' },

  { id: 'comms:messages:read', label: 'مشاهده پیام‌ها/چت‌ها (بازبینی)', group: 'Communications' },
  { id: 'comms:messages:moderate', label: 'اقدام مدیریتی روی چت‌ها (moderation)', group: 'Communications' },
  { id: 'comms:notifications:read', label: 'مشاهده اعلان‌ها', group: 'Communications' },
  { id: 'comms:notifications:write', label: 'ارسال/ویرایش اعلان‌ها', group: 'Communications' },

  { id: 'billing:transactions:read', label: 'مشاهده تراکنش‌ها', group: 'Billing' },
  { id: 'billing:transactions:write', label: 'اقدام روی تراکنش‌ها/تسویه', group: 'Billing' },

  { id: 'ops:files:read', label: 'مشاهده فایل‌ها و آپلودها', group: 'Ops' },
  { id: 'ops:workflow:read', label: 'مشاهده گردش‌کارها و صف‌ها', group: 'Ops' },
  { id: 'ops:settings:write', label: 'ویرایش تنظیمات سیستم', group: 'Ops' },
  { id: 'ops:system:write', label: 'عملیات حساس سیستم', group: 'Ops' },
  {
    id: 'ops:intake-migration:read',
    label: 'مشاهده داشبورد مهاجرت Intake',
    group: 'Ops',
  },
  {
    id: 'ops:intake-training:read',
    label: 'مشاهده داده آموزشی Intake',
    group: 'Ops',
  },
  {
    id: 'ops:intake-training:write',
    label: 'بازبینی و اصلاح نمونه‌های آموزشی',
    group: 'Ops',
  },

  { id: 'rbac:roles:read', label: 'مشاهده نقش‌های کارمندی', group: 'RBAC' },
  { id: 'rbac:roles:write', label: 'ساخت/ویرایش نقش‌های کارمندی', group: 'RBAC' },
  { id: 'rbac:assignments:write', label: 'اختصاص نقش به کاربران', group: 'RBAC' },

  { id: 'audit:read', label: 'مشاهده گزارش تغییرات (Audit)', group: 'Audit' },
] as const;

export const ADMIN_PERMISSION_GROUPS: readonly AdminPermission['group'][] = [
  'Core',
  'Taxonomy',
  'Geo',
  'CRM',
  'Marketplace',
  'Businesses',
  'Content',
  'Communications',
  'Billing',
  'Ops',
  'RBAC',
  'Audit',
] as const;

export function permissionsByGroup() {
  const map = new Map<AdminPermission['group'], AdminPermission[]>();
  for (const group of ADMIN_PERMISSION_GROUPS) map.set(group, []);
  for (const perm of ADMIN_PERMISSIONS) map.get(perm.group)!.push(perm);
  return map;
}

