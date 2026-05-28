'use client';

import { SuperAdminShell } from '@/components/admin/SuperAdminShell';
import { IntakeMigrationDashboard } from '@/components/admin/modules/IntakeMigrationDashboard';

export default function IntakeMigrationPage() {
  return (
    <SuperAdminShell>
      <IntakeMigrationDashboard />
    </SuperAdminShell>
  );
}
