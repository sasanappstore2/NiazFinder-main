'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Business } from '@/contracts/business-profile';
import { useContactCallSheet } from '@/components/contact/use-contact-call-sheet';
import { useAppStore } from '@/lib/store';

export function useListingContact(business: Business, requestId?: string) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const { openCallSheet, sheet: callSheet } = useContactCallSheet();

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
    await openCallSheet({
      otherUserId: business.userId,
      requestId,
      displayName: business.name,
      avatarUrl: business.identity.logo,
    });
  }, [business.identity.logo, business.name, business.userId, openCallSheet, requestId]);

  return { onChat, onCall, callSheet };
}
