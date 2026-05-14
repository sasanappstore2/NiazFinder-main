'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserDashboard } from '@/components/dashboard/UserDashboard';

export default function DashboardRoute() {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
        <Breadcrumb />
        <Separator className="my-4" />
        <UserDashboard />
      </div>
    </AuthGuard>
  );
}
