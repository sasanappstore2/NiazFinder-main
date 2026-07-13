'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { EditProfilePage } from '@/components/social/EditProfilePage';
import { SITE_LABELS } from '@/config/site-labels';

export default function EditProfileRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium" className="space-y-6">
        <PageChrome title={SITE_LABELS.editProfile} />
        <EditProfilePage />
      </PageContainer>
    </AuthGuard>
  );
}
