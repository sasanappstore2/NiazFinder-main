'use client';

export { CategoriesPanel } from './CategoriesPanel';

import { useState } from 'react';
import { AdminPageShell } from '@/components/admin/ui';
import { LocationsAdminPanel } from '@/components/admin/locations/LocationsAdminPanel';

export function LocationsPanel() {
  const [neighborhoodsFullPage, setNeighborhoodsFullPage] = useState(false);

  return (
    <AdminPageShell
      section="locations"
      layout={neighborhoodsFullPage ? 'dashboard' : 'form'}
      bare={neighborhoodsFullPage}
      description={neighborhoodsFullPage ? undefined : '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0627\u0633\u062a\u0627\u0646\u060c \u0634\u0647\u0631 \u0648 \u0645\u062d\u0644\u0647'}
    >
      <div className="admin-content-zone">
        <LocationsAdminPanel onFullPageChange={setNeighborhoodsFullPage} />
      </div>
    </AdminPageShell>
  );
}
