'use client';

import { useCallback, useState } from 'react';
import { AdminLayoutProvider } from '@/components/admin/context/AdminLayoutContext';
import { AdminLayout } from '@/components/admin/nellavio/AdminLayout';
import { SuperAdminModule } from '@/components/admin/modules/SuperAdminModule';
import type { AdminSectionId } from '@/config/admin-routes';

export function SuperAdminPageClient({ section }: { section: AdminSectionId }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('admin-refresh'));
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  return (
    <AdminLayoutProvider>
      <AdminLayout onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        <div className="admin-content-zone">
          <SuperAdminModule section={section} />
        </div>
      </AdminLayout>
    </AdminLayoutProvider>
  );
}
