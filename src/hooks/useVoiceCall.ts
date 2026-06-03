'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

export type VoiceCallPhase = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended';

interface VoiceCredentials {
  janus: {
    wsUrl: string;
    roomId: number;
    plugin: string;
    iceTransportPolicy: 'relay' | 'all';
  } | null;
  iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}

/**
 * Voice calls: loads Janus/TURN credentials when configured.
 * Signaling for P2P remains in `call-controller` + chat-service socket events.
 * Attach `janus-gateway` at runtime when `NEXT_PUBLIC_JANUS_WS_URL` is set.
 */
export function useVoiceCall(conversationId: string | null) {
  const { authToken } = useAppStore();
  const [phase, setPhase] = useState<VoiceCallPhase>('idle');
  const credsRef = useRef<VoiceCredentials | null>(null);

  const loadCredentials = useCallback(async () => {
    if (!authToken || !conversationId) return null;
    const res = await fetch(
      `/api/voice/credentials?conversationId=${encodeURIComponent(conversationId)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as VoiceCredentials;
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
    janusEnabled: Boolean(process.env.NEXT_PUBLIC_JANUS_WS_URL),
    credentials: credsRef,
  };
}
