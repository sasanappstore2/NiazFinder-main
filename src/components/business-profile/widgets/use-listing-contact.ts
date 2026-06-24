'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Business } from '@/contracts/business-profile';
import { useAppStore } from '@/lib/store';

export function useListingContact(business: Business, requestId?: string) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated || !authToken) {
      setAuthModalOpen(true);
      return false;
    }
    return true;
  }, [authToken, isAuthenticated, setAuthModalOpen]);

  const onChat = useCallback(async () => {
    if (!requireAuth()) return;
    try {
      const { startConversation, syncAndNavigateToConversation } = await import(
        '@/lib/contact/start-conversation'
      );
      const result = await startConversation(
        { otherUserId: business.userId, requestId },
        authToken!
      );
      syncAndNavigateToConversation(router, result);
    } catch {
      toast.error('خطا در باز کردن گفتگو');
    }
  }, [authToken, business.userId, requestId, requireAuth, router]);

  const onCall = useCallback(async () => {
    if (!requireAuth()) return;
    try {
      const { fetchUserContact } = await import('@/lib/contact/fetch-contact');
      const contact = await fetchUserContact(business.userId, authToken!, { requestId });
      const parts = contact.displayName.split(/\s+/);
      openVoiceCall({
        id: business.userId,
        firstName: parts[0] ?? business.name,
        lastName: parts.slice(1).join(' ') || '',
        displayName: contact.displayName,
      });
    } catch {
      toast.error('خطا در برقراری تماس');
    }
  }, [authToken, business.name, business.userId, openVoiceCall, requestId, requireAuth]);

  return { onChat, onCall };
}
