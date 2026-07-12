'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { SocialFeedPage } from '@/components/social/SocialFeedPage';
import { SITE_LABELS } from '@/config/site-labels';

export default function SocialFeedRoute() {
  return (
    <AuthGuard>
      <PageContainer width="narrow" className="space-y-6 pb-24">
        <PageChrome title={SITE_LABELS.socialFeed} />
        <SocialFeedPage />
      </PageContainer>
    </AuthGuard>
  );
}
