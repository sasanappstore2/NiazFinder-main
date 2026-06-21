'use client';

import { getClientAuthToken } from '@/lib/auth/client-auth';
import { useAppStore } from '@/lib/store';

/** After socket connects, deliver a RINGING invite the client may have missed. */
export async function fetchAndDispatchPendingIncomingCall(): Promise<void> {
  const token = useAppStore.getState().authToken ?? getClientAuthToken();
  if (!token) return;

  if (useAppStore.getState().voiceCallOpen) return;

  try {
    const res = await fetch('/api/calls/incoming', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return;

    const json = (await res.json()) as {
      call?: {
        callId: string;
        callerId: string;
        sdpOffer?: RTCSessionDescriptionInit | null;
        from?: {
          id: string;
          firstName: string;
          lastName: string;
          displayName?: string | null;
          avatar?: string | null;
        };
      } | null;
    };

    const call = json.call;
    if (!call?.callId || !call.sdpOffer?.sdp) return;

    window.dispatchEvent(
      new CustomEvent('call:invite', {
        detail: {
          callId: call.callId,
          from: {
            id: call.from?.id ?? call.callerId,
            firstName: call.from?.firstName ?? '',
            lastName: call.from?.lastName ?? '',
            displayName: call.from?.displayName ?? undefined,
            avatar: call.from?.avatar ?? undefined,
            email: '',
            role: 'CLIENT' as const,
            isVerified: false,
            isActive: true,
            online: true,
          },
          sdpOffer: call.sdpOffer,
        },
      })
    );
  } catch {
    /* ignore */
  }
}
