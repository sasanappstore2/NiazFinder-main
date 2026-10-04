'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { UserDiscovery } from '@/components/social/UserDiscovery';
import { SITE_LABELS } from '@/config/site-labels';

export default function DiscoverRoute() {
  return (
    <AuthGuard>
      <PageContainer className="space-y-6">
        <PageChrome title={SITE_LABELS.discover} />
        <UserDiscovery />
      </PageContainer>
    </AuthGuard>
  );
}
