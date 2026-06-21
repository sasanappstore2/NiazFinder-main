'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import {
  startConversation,
  syncAndNavigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { savePendingContact } from '@/lib/contact/pending-contact';

export function useStartChat() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const openChat = async (otherUserId: string, requestId?: string) => {
    if (!isAuthenticated || !authToken) {
      savePendingContact({
        action: 'chat',
        otherUserId,
        requestId,
        returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      setAuthModalOpen(true);
      return;
    }
    try {
      const result = await startConversation(
        { otherUserId, requestId },
        authToken
      );
      syncAndNavigateToConversation(router, result);
    } catch (e) {
      if (e instanceof ContactAuthRequiredError) {
        setAuthModalOpen(true);
      } else {
        toast.error(e instanceof Error ? e.message : 'خطا در چت');
      }
    }
  };

  return { openChat };
}
