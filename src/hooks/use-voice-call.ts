'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  registerCallController,
  registerCallSocketEmit,
  handleCallInvite,
  handleCallAccept,
  handleCallIce,
  handleCallReject,
  handleCallHangup,
} from '@/lib/voice/call-controller';

export function useVoiceCallSignaling() {
  useEffect(() => {
    registerCallController({
      getVoiceCallId: () => useAppStore.getState().voiceCallId,
      setState: (partial) => useAppStore.setState(partial),
      getAuthToken: () => useAppStore.getState().authToken,
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

    window.addEventListener('call:invite', onInvite);
    window.addEventListener('call:accept', onAccept);
    window.addEventListener('call:ice-candidate', onIce);
    window.addEventListener('call:reject', onReject);
    window.addEventListener('call:hangup', onHangup);

    return () => {
      window.removeEventListener('call:invite', onInvite);
      window.removeEventListener('call:accept', onAccept);
      window.removeEventListener('call:ice-candidate', onIce);
      window.removeEventListener('call:reject', onReject);
      window.removeEventListener('call:hangup', onHangup);
    };
  }, []);
}
