'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ADMIN_SECTION_ROUTES, type AdminSectionId } from '@/config/admin-routes';

export type AdminPageLayout = 'dashboard' | 'table' | 'form';

const SECTION_LABELS: Record<AdminSectionId, string> = {
  overview: 'داشبورد',
  analytics: 'داشبورد',
  categories: 'دسته‌بندی‌ها',
  locations: 'مکان‌ها',
  requests: 'نیازها',
  businesses: 'کسب‌وکارها',
  users: 'کاربران',
  messages: 'بازبینی چت‌ها',
  system: 'نقش‌ها و دسترسی‌ها',
  settings: 'تنظیمات',
};

export function AdminPageShell({
  section,
  layout = 'dashboard',
  title,
  description,
  actions,
  children,
}: {
  section: AdminSectionId;
  layout?: AdminPageLayout;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pageTitle = title ?? SECTION_LABELS[section];
  const isTable = layout === 'table';

  return (
    <div className="admin-page-shell space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-(--color-secondaryText)">
            <Link href={ADMIN_SECTION_ROUTES.overview} className="hover:text-(--color-coloredText)">
              سوپرادمین
            </Link>
            <ChevronLeft className="size-3 opacity-50" />
            <span className="text-(--color-primaryText)">{pageTitle}</span>
          </nav>
          <h1 className="admin-page-title">{pageTitle}</h1>
          {description && <p className="admin-page-subtitle mt-1">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {isTable ? (
        <div className="admin-paper overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
