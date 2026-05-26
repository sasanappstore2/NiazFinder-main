'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { resumePendingContact, type ResumeDeps } from '@/lib/contact/resume-pending';

/** Resume chat/call intent after login (sessionStorage). */
export function useResumePendingContact() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !authToken || ran.current) return;
    ran.current = true;
    void resumePendingContact({
      isAuthenticated,
      authToken,
      router,
      openVoiceCall: openVoiceCall as ResumeDeps['openVoiceCall'],
    });
  }, [isAuthenticated, authToken, router, openVoiceCall]);
}
