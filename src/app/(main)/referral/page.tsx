'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { ReferralPage } from '@/components/dashboard/ReferralPage';
import { SITE_LABELS } from '@/config/site-labels';

export default function ReferralRoute() {
  return (
    <PageContainer width="content" className="space-y-6">
      <PageChrome title={SITE_LABELS.referral} />
      <ReferralPage />
    </PageContainer>
  );
}
