'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ADMIN_SECTION_ROUTES, type AdminSectionId } from '@/config/admin-routes';
import { cn } from '@/lib/utils';

export type AdminPageLayout = 'dashboard' | 'table' | 'form';

const SECTION_LABELS: Record<AdminSectionId, string> = {
  overview: 'داشبورد',
  analytics: 'تحلیل‌ها',
  workflow: 'صف‌های کاری',
  categories: 'دسته‌بندی نیازها',
  'business-occupations': 'دسته‌بندی کسب‌وکار',
  'online-stores': 'فروشگاه‌های اینترنتی',
  locations: 'مکان‌ها',
  requests: 'نیازها',
  proposals: 'پیشنهادها',
  businesses: 'کسب‌وکارها',
  outreach: 'Outreach',
  'need-alerts': 'Alertهای مرور',
  users: 'کاربران',
  reports: 'گزارش تخلف',
  messages: 'بازبینی چت‌ها',
  'voice-calls': 'تماس صوتی',
  notifications: 'اعلان‌ها',
  reviews: 'نظرات',
  billing: 'تراکنش‌ها',
  system: 'نقش‌ها و دسترسی‌ها',
  audit: 'گزارش تغییرات',
  files: 'فایل‌ها',
  settings: 'تنظیمات',
  referrals: 'ارجاع‌ها',
  coupons: 'کوپن‌ها',
};

export function AdminPageShell({
  section,
  layout = 'dashboard',
  title,
  description,
  actions,
  children,
  bare = false,
}: {
  section: AdminSectionId;
  layout?: AdminPageLayout;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** بدون هدر صفحه — برای زیرصفحه‌های تمام‌عرض مثل مدیریت محله‌ها */
  bare?: boolean;
}) {
  const pageTitle = title ?? SECTION_LABELS[section];
  const isTable = layout === 'table';

  return (
    <div className={cn('admin-page-shell', !bare && 'space-y-6')}>
      <div className={cn(bare && 'hidden')} aria-hidden={bare}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <nav
              aria-label="breadcrumb"
              className="admin-breadcrumb mb-2.5 flex items-center gap-1 text-xs text-(--color-tertiaryText)"
            >
              <Link href={ADMIN_SECTION_ROUTES.overview}>سوپرادمین</Link>
              <ChevronLeft className="size-3 opacity-40" aria-hidden />
              <span className="font-medium text-(--color-secondaryText)">{pageTitle}</span>
            </nav>
            <h1 className="admin-page-title">{pageTitle}</h1>
            {description && <p className="admin-page-subtitle mt-1.5">{description}</p>}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg)/60 p-1.5 shadow-sm backdrop-blur-sm">
              {actions}
            </div>
          )}
        </div>
      </div>

      {isTable && !bare ? (
        <div className="admin-paper-elevated overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
