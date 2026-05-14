'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function AdminRoute() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  );
}
