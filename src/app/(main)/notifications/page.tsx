'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { NotificationsPanel } from '@/components/chat/NotificationsPanel';
import { SITE_LABELS } from '@/config/site-labels';

export default function NotificationsRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium" className="min-w-0 space-y-6">
        <PageChrome title={SITE_LABELS.notifications} />
        <NotificationsPanel />
      </PageContainer>
    </AuthGuard>
  );
}
