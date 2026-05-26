'use client';

export { CategoriesPanel } from './CategoriesPanel';

import { AdminPageShell } from '@/components/admin/ui';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';

export function LocationsPanel() {
  return (
    <AdminPageShell section="locations" layout="form" description="مدیریت استان، شهر و محله">
      <div className="admin-content-zone">
        <SuperAdminDashboard section="locations" embedded />
      </div>
    </AdminPageShell>
  );
}
