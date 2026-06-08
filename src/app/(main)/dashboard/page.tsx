'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserDashboard } from '@/components/dashboard/UserDashboard';

export default function DashboardRoute() {
  return (
    <AuthGuard routeView="dashboard">
      <PageContainer>
        <Breadcrumb />
        <Separator className="my-4" />
        <Suspense fallback={null}>
          <UserDashboard />
        </Suspense>
      </PageContainer>
    </AuthGuard>
  );
}
