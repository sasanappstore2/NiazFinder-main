'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { EditProfilePage } from '@/components/social/EditProfilePage';

export default function EditProfileRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium">
        <Breadcrumb />
        <Separator className="my-4" />
        <EditProfilePage />
      </PageContainer>
    </AuthGuard>
  );
}
