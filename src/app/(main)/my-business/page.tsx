'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { MyBusinessEditPage } from '@/components/business-profile/MyBusinessEditPage';
import { SITE_LABELS } from '@/config/site-labels';

export default function MyBusinessPage() {
  return (
    <AuthGuard>
      <PageContainer width="content" className="space-y-6">
        <PageChrome title={SITE_LABELS.myBusiness} />
        <MyBusinessEditPage fixedRoute />
      </PageContainer>
    </AuthGuard>
  );
}
