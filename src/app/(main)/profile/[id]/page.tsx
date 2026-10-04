'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { UserProfile } from '@/components/social/UserProfile';
import { SITE_LABELS } from '@/config/site-labels';

export default function ProfileRoute() {
  return (
    <AuthGuard>
      <PageContainer width="content" className="space-y-6">
        <PageChrome title={SITE_LABELS.profile} />
        <UserProfile />
      </PageContainer>
    </AuthGuard>
  );
}
