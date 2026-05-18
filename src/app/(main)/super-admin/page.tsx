'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';

export default function SuperAdminRoute() {
  return (
    <AuthGuard>
      <SuperAdminDashboard />
    </AuthGuard>
  );
}
