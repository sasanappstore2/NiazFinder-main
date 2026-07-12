'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { fetchUserContact, type UserContactInfo } from '@/lib/contact/fetch-contact';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { ContactCallSheet } from '@/components/contact/ContactCallSheet';

export type ContactCallTarget = {
  otherUserId: string;
  requestId?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export function useContactCallSheet() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inAppLoading, setInAppLoading] = useState(false);
  const [contact, setContact] = useState<UserContactInfo | null>(null);
  const [target, setTarget] = useState<ContactCallTarget | null>(null);

  const openCallSheet = useCallback(
    async (params: ContactCallTarget) => {
      if (!isAuthenticated || !authToken) {
        savePendingContact({
          action: 'call',
          otherUserId: params.otherUserId,
          requestId: params.requestId,
          returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
        setAuthModalOpen(true);
        return;
      }

      setTarget(params);
      setContact(null);
      setOpen(true);
      setLoading(true);

      try {
        const info = await fetchUserContact(params.otherUserId, authToken, {
          requestId: params.requestId,
        });
        setContact(info);
      } catch (e) {
        setOpen(false);
        toast.error(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات تماس');
      } finally {
        setLoading(false);
      }
    },
    [authToken, isAuthenticated, setAuthModalOpen]
  );

  const handleInAppCall = useCallback(() => {
    if (!contact) return;
    setInAppLoading(true);
    try {
      const parts = contact.displayName.split(/\s+/);
      openVoiceCall({
        id: contact.userId,
        firstName: parts[0] ?? target?.displayName ?? contact.displayName,
        lastName: parts.slice(1).join(' ') || '',
        displayName: contact.displayName,
      });
      setOpen(false);
    } finally {
      setInAppLoading(false);
    }
  }, [contact, openVoiceCall, target?.displayName]);

  const sheet = (
    <ContactCallSheet
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      inAppLoading={inAppLoading}
      contact={contact}
      displayName={target?.displayName ?? contact?.displayName}
      avatarUrl={target?.avatarUrl}
      onInAppCall={handleInAppCall}
    />
  );

  return { openCallSheet, sheet };
}
