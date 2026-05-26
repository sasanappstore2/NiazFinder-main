'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { SocialFeedPage } from '@/components/social/SocialFeedPage';

export default function SocialFeedRoute() {
  return (
    <AuthGuard>
      <PageContainer width="narrow" className="pb-24">
        <SocialFeedPage />
      </PageContainer>
    </AuthGuard>
  );
}
