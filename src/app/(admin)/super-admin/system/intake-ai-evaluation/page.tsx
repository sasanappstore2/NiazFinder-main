'use client';

import { SuperAdminShell } from '@/components/admin/SuperAdminShell';
import { IntakeAiEvaluationDashboard } from '@/components/admin/modules/IntakeAiEvaluationDashboard';

export default function IntakeAiEvaluationPage() {
  return (
    <SuperAdminShell>
      <IntakeAiEvaluationDashboard />
    </SuperAdminShell>
  );
}
