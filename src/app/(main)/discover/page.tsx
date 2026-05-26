'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserDiscovery } from '@/components/social/UserDiscovery';

export default function DiscoverRoute() {
  return (
    <AuthGuard>
      <PageContainer>
        <Breadcrumb />
        <Separator className="my-4" />
        <UserDiscovery />
      </PageContainer>
    </AuthGuard>
  );
}
