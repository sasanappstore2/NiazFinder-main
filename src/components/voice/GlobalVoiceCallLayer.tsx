'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { VoiceCallOverlay } from '@/components/chat/VoiceCallOverlay';
import { useVoiceCallSignaling } from '@/hooks/use-voice-call';
import { useChatSocket } from '@/lib/chat-socket';

function VoiceCallOverlayWhenActive() {
  const voiceCallOpen = useAppStore((s) => s.voiceCallOpen);
  const voiceCallTarget = useAppStore((s) => s.voiceCallTarget);
  const voiceCallType = useAppStore((s) => s.voiceCallType);
  const hangupVoiceCall = useAppStore((s) => s.hangupVoiceCall);

  if (!voiceCallOpen || !voiceCallTarget) return null;

  return (
    <VoiceCallOverlay
      isOpen={voiceCallOpen}
      onClose={hangupVoiceCall}
      targetUser={voiceCallTarget}
      callType={voiceCallType}
    />
  );
}

/** تماس صوتی سراسری — روی همهٔ routeها (main، chat، super-admin، …) */
export function GlobalVoiceCallLayer() {
  useChatSocket();
  useVoiceCallSignaling();

  const initializeFromStorage = useAppStore((s) => s.initializeFromStorage);

  useEffect(() => {
    initializeFromStorage().catch(() => {});
  }, [initializeFromStorage]);

  return <VoiceCallOverlayWhenActive />;
}
