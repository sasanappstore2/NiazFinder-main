'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function MessagesRoute() {
  return (
    <AuthGuard>
      <PageContainer className="h-messages-panel flex min-h-0 flex-col lg:pb-12!">
        <Breadcrumb />
        <Separator className="my-4" />
        <ChatPanel />
      </PageContainer>
    </AuthGuard>
  );
}
