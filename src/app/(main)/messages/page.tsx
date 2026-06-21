'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useHandheldViewport } from '@/hooks/use-device-tier';

export default function MessagesRoute() {
  const router = useRouter();
  const handheld = useHandheldViewport();

  useEffect(() => {
    if (handheld) {
      router.replace('/chat');
    }
  }, [handheld, router]);

  if (handheld) {
    return null;
  }

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
