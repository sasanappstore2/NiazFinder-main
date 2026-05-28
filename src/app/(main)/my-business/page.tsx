'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { MyBusinessEditPage } from '@/components/business-profile/MyBusinessEditPage';

export default function MyBusinessPage() {
  return (
    <AuthGuard>
      <PageContainer width="content">
        <MyBusinessEditPage fixedRoute />
      </PageContainer>
    </AuthGuard>
  );
}
