'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/components/social/UserProfile';

export default function ProfileRoute() {
  return (
    <AuthGuard>
      <PageContainer width="content">
        <Breadcrumb />
        <Separator className="my-4" />
        <UserProfile />
      </PageContainer>
    </AuthGuard>
  );
}
