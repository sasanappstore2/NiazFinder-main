import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FolderTree,
  Globe2,
  MessagesSquare,
  Users,
  ListChecks,
  ShieldCheck,
  Building2,
  Settings2,
} from 'lucide-react';
import type { AdminPermissionId } from '@/config/admin-permissions';

export type SuperAdminNavItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  /** Used later for RBAC-driven menu visibility */
  permission: AdminPermissionId;
};

export type SuperAdminNavGroup = {
  label: string;
  items: SuperAdminNavItem[];
};

/**
 * Nellavio-style left navigation, customized for NiazFinder.
 * We keep it permission-aware from day 1 so RBAC is a drop-in later.
 */
export const SUPER_ADMIN_NAV: readonly SuperAdminNavGroup[] = [
  {
    label: 'اصلی',
    items: [
      {
        id: 'overview',
        label: 'داشبورد',
        description: 'آمار، نمودار و میانبرها',
        href: '/super-admin',
        icon: BarChart3,
        permission: 'superadmin:overview:read',
      },
    ],
  },
  {
    label: 'مدیریت محتوا',
    items: [
      {
        id: 'categories',
        label: 'دسته‌بندی‌ها',
        description: 'ساختار خدمات و فیلترها',
        href: '/super-admin/categories',
        icon: FolderTree,
        permission: 'taxonomy:categories:read',
      },
      {
        id: 'locations',
        label: 'مکان‌ها',
        description: 'استان، شهر و محله',
        href: '/super-admin/locations',
        icon: Globe2,
        permission: 'geo:locations:read',
      },
    ],
  },
  {
    label: 'بازار',
    items: [
      {
        id: 'requests',
        label: 'نیازها',
        description: 'صف و بازبینی نیازها',
        href: '/super-admin/requests',
        icon: ListChecks,
        permission: 'market:requests:read',
      },
      {
        id: 'businesses',
        label: 'کسب‌وکارها',
        description: 'مدیریت پروفایل متخصص‌ها',
        href: '/super-admin/businesses',
        icon: Building2,
        permission: 'market:businesses:read',
      },
    ],
  },
  {
    label: 'CRM و ارتباطات',
    items: [
      {
        id: 'users',
        label: 'کاربران',
        description: 'وضعیت حساب‌ها و نقش‌ها',
        href: '/super-admin/users',
        icon: Users,
        permission: 'crm:users:read',
      },
      {
        id: 'messages',
        label: 'بازبینی چت‌ها',
        description: 'مشاهده و کنترل گفتگوها',
        href: '/super-admin/messages',
        icon: MessagesSquare,
        permission: 'comms:messages:read',
      },
    ],
  },
  {
    label: 'سیستم',
    items: [
      {
        id: 'system',
        label: 'نقش‌ها و دسترسی‌ها',
        description: 'مدیریت کارمندان و مجوزها',
        href: '/super-admin/system',
        icon: ShieldCheck,
        permission: 'rbac:roles:read',
      },
      {
        id: 'settings',
        label: 'تنظیمات',
        description: 'پیکربندی و سیاست‌ها',
        href: '/super-admin/settings',
        icon: Settings2,
        permission: 'ops:settings:write',
      },
    ],
  },
] as const;

