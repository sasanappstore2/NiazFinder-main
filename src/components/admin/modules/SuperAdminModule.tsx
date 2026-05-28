'use client';

import { Lock } from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { ADMIN_SECTION_PERMISSIONS, type AdminSectionId } from '@/config/admin-routes';
import { OverviewPanel } from './OverviewPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { LocationsPanel } from './CategoriesLocationsPanels';
import { UsersPanel } from './UsersPanel';
import { RequestsPanel } from './RequestsPanel';
import { BusinessesPanel } from './BusinessesPanel';
import { MessagesPanel } from './MessagesPanel';
import { SystemPanel } from './SystemPanel';
import { SettingsPanel } from './SettingsPanel';

export function SuperAdminModule({ section }: { section: AdminSectionId }) {
  const { me, isLoading, hasPermission } = useAdmin();
  const requiredPermission = ADMIN_SECTION_PERMISSIONS[section];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-(--color-secondaryText)">
        <div className="admin-spinner size-8 animate-spin rounded-full border-2" />
        <p className="text-sm">در حال بررسی دسترسی...</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">ورود لازم است</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          برای دسترسی به پنل سوپرادمین وارد حساب کاربری شوید.
        </p>
      </div>
    );
  }

  const canViewDashboard =
    hasPermission('superadmin:overview:read') || hasPermission('superadmin:analytics:read');

  if ((section === 'overview' || section === 'analytics') && !canViewDashboard) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی کافی ندارید</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          مجوز مشاهده داشبورد لازم است.
        </p>
      </div>
    );
  }

  if (!hasPermission(requiredPermission) && section !== 'overview' && section !== 'analytics') {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی کافی ندارید</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          مجوز `{requiredPermission}` برای این بخش لازم است.
        </p>
      </div>
    );
  }

  switch (section) {
    case 'overview':
    case 'analytics':
      return <OverviewPanel />;
    case 'categories':
      return <CategoriesPanel />;
    case 'locations':
      return <LocationsPanel />;
    case 'users':
      return <UsersPanel />;
    case 'requests':
      return <RequestsPanel />;
    case 'businesses':
      return <BusinessesPanel />;
    case 'messages':
      return <MessagesPanel />;
    case 'system':
      return <SystemPanel />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return <OverviewPanel />;
  }
}
