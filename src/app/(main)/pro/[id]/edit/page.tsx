'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { MyBusinessEditPage } from '@/components/business-profile/MyBusinessEditPage';
import { use } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessEditRoute({ params }: PageProps) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <PageContainer width="wide">
        <Breadcrumb />
        <Separator className="my-4" />
        <MyBusinessEditPage slugFromUrl={decodeURIComponent(id)} />
      </PageContainer>
    </AuthGuard>
  );
}
