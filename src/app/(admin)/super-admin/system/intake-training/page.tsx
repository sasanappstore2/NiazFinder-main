'use client';

import { SuperAdminShell } from '@/components/admin/SuperAdminShell';
import { IntakeTrainingDashboard } from '@/components/admin/modules/IntakeTrainingDashboard';

export default function IntakeTrainingPage() {
  return (
    <SuperAdminShell>
      <IntakeTrainingDashboard />
    </SuperAdminShell>
  );
}
