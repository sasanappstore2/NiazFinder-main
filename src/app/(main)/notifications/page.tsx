'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NotificationsPanel } from '@/components/chat/NotificationsPanel';

export default function NotificationsRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium">
        <Breadcrumb />
        <Separator className="my-4" />
        <NotificationsPanel />
      </PageContainer>
    </AuthGuard>
  );
}
