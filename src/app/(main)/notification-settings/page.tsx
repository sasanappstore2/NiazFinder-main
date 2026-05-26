'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';

export default function NotificationSettingsRoute() {
  return (
    <PageContainer width="medium">
      <Breadcrumb />
      <Separator className="my-4" />
      <NotificationSettings />
    </PageContainer>
  );
}
