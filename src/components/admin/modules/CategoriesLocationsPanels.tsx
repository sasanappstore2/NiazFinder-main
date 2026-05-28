'use client';

export { CategoriesPanel } from './CategoriesPanel';

import { useState } from 'react';
import { AdminPageShell } from '@/components/admin/ui';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';

export function LocationsPanel() {
  const [neighborhoodsFullPage, setNeighborhoodsFullPage] = useState(false);

  return (
    <AdminPageShell
      section="locations"
      layout={neighborhoodsFullPage ? 'dashboard' : 'form'}
      bare={neighborhoodsFullPage}
      description={neighborhoodsFullPage ? undefined : 'مدیریت استان، شهر و محله'}
    >
      <div className="admin-content-zone">
        <SuperAdminDashboard
          section="locations"
          embedded
          onLocationsFullPage={setNeighborhoodsFullPage}
        />
      </div>
    </AdminPageShell>
  );
}
