'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  isJanusConfigured,
  loadVoiceCredentials,
  type VoiceCredentialsResponse,
} from '@/lib/voice/load-voice-credentials';

export type VoiceCallPhase = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended';

/**
 * @deprecated Prefer primary path: `useVoiceCallSignaling` + `call-controller`.
 * This hook only loads `/api/voice/credentials` for optional Janus SFU experiments.
 * Overlay media uses P2P ICE from `/api/calls` (relay when NEXT_PUBLIC_VOICE_RELAY_ONLY=true).
 */
export function useVoiceCall(conversationId: string | null) {
  const { authToken } = useAppStore();
  const [phase, setPhase] = useState<VoiceCallPhase>('idle');
  const credsRef = useRef<VoiceCredentialsResponse | null>(null);

  const loadCredentials = useCallback(async () => {
    if (!authToken || !conversationId) return null;
    const data = await loadVoiceCredentials(conversationId, authToken);
    credsRef.current = data;
    return data;
  }, [authToken, conversationId]);

  const startJanusCall = useCallback(async () => {
    const creds = credsRef.current ?? (await loadCredentials());
    if (!creds?.janus?.wsUrl) return false;
    setPhase('active');
    return true;
  }, [loadCredentials]);

  const endCall = useCallback(() => {
    setPhase('ended');
    setTimeout(() => setPhase('idle'), 400);
  }, []);

  useEffect(() => () => endCall(), [endCall]);

  return {
    phase,
    setPhase,
    loadCredentials,
    startJanusCall,
    endCall,
    janusEnabled: isJanusConfigured(),
    credentials: credsRef,
  };
}
