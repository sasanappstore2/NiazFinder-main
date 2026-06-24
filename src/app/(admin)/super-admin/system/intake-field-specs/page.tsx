'use client';

import { SuperAdminShell } from '@/components/admin/SuperAdminShell';
import { IntakeFieldSpecsDashboard } from '@/components/admin/modules/IntakeFieldSpecsDashboard';

export default function IntakeFieldSpecsPage() {
  return (
    <SuperAdminShell>
      <IntakeFieldSpecsDashboard />
    </SuperAdminShell>
  );
}
