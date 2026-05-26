'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ReferralPage } from '@/components/dashboard/ReferralPage';

export default function ReferralRoute() {
  return (
    <PageContainer width="content">
      <Breadcrumb />
      <Separator className="my-4" />
      <ReferralPage />
    </PageContainer>
  );
}
