'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  registerCallController,
  registerCallSocketEmit,
  handleCallInvite,
  handleCallRinging,
  handleCallAccepted,
  handleCallAccept,
  handleCallIce,
  handleCallReject,
  handleCallHangup,
  handleCallUnavailable,
  applyServerStatus,
} from '@/lib/voice/call-controller';
import { getClientAuthToken } from '@/lib/auth/client-auth';

const RINGING_POLL_MS = 3_000;

export function useVoiceCallSignaling() {
  const voiceCallId = useAppStore((s) => s.voiceCallId);
  const voiceCallStatus = useAppStore((s) => s.voiceCallStatus);

  // Socket-loss fallback: while a call is ringing, reconcile with the server.
  // Without this, a missed `call:accepted`/`call:reject` socket event leaves
  // the caller "ringing" forever even though the callee already answered.
  useEffect(() => {
    if (!voiceCallId || voiceCallStatus !== 'ringing') return;
    const timer = setInterval(() => {
      void applyServerStatus(voiceCallId);
    }, RINGING_POLL_MS);
    return () => clearInterval(timer);
  }, [voiceCallId, voiceCallStatus]);

  useEffect(() => {
    registerCallController({
      getVoiceCallId: () => useAppStore.getState().voiceCallId,
      setState: (partial) => useAppStore.setState(partial),
      getAuthToken: () => useAppStore.getState().authToken ?? getClientAuthToken(),
      getCurrentUserId: () => useAppStore.getState().currentUser?.id ?? null,
      incrementCallDuration: () =>
        useAppStore.setState((s) => ({ voiceCallDuration: s.voiceCallDuration + 1 })),
    });

    registerCallSocketEmit((event, payload) => {
      const socket = (window as unknown as { __chatSocket?: { emit: (e: string, p: unknown) => void } })
        .__chatSocket;
      socket?.emit(event, payload);
    });
  }, []);

  useEffect(() => {
    const onInvite = (e: Event) => {
      handleCallInvite((e as CustomEvent).detail);
    };
    const onRinging = (e: Event) => {
      handleCallRinging((e as CustomEvent).detail);
    };
    const onAccepted = (e: Event) => {
      void handleCallAccepted((e as CustomEvent).detail);
    };
    const onAccept = (e: Event) => {
      void handleCallAccept((e as CustomEvent).detail);
    };
    const onIce = (e: Event) => {
      void handleCallIce((e as CustomEvent).detail);
    };
    const onReject = (e: Event) => {
      handleCallReject((e as CustomEvent).detail);
    };
    const onHangup = (e: Event) => {
      handleCallHangup((e as CustomEvent).detail);
    };
    const onUnavailable = (e: Event) => {
      handleCallUnavailable((e as CustomEvent).detail);
    };

    window.addEventListener('call:invite', onInvite);
    window.addEventListener('call:ringing', onRinging);
    window.addEventListener('call:accepted', onAccepted);
    window.addEventListener('call:accept', onAccept);
    window.addEventListener('call:ice-candidate', onIce);
    window.addEventListener('call:reject', onReject);
    window.addEventListener('call:hangup', onHangup);
    window.addEventListener('call:unavailable', onUnavailable);

    return () => {
      window.removeEventListener('call:invite', onInvite);
      window.removeEventListener('call:ringing', onRinging);
      window.removeEventListener('call:accepted', onAccepted);
      window.removeEventListener('call:accept', onAccept);
      window.removeEventListener('call:ice-candidate', onIce);
      window.removeEventListener('call:reject', onReject);
      window.removeEventListener('call:hangup', onHangup);
      window.removeEventListener('call:unavailable', onUnavailable);
    };
  }, []);
}
