'use client';

import { Suspense } from 'react';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { SITE_LABELS } from '@/config/site-labels';

export default function DashboardRoute() {
  return (
    <AuthGuard routeView="dashboard">
      <PageContainer width="wide">
        <PageChrome title={SITE_LABELS.dashboard} />
        <div className="mt-6 space-y-8">
          <Suspense fallback={null}>
            <UserDashboard />
          </Suspense>
        </div>
      </PageContainer>
    </AuthGuard>
  );
}
