'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useVoiceCallSignaling } from '@/hooks/use-voice-call';
import { useChatSocket } from '@/lib/chat-socket';
import { allowChatSocketConnect } from '@/lib/chat/socket-connect-policy';
import { useAppStore } from '@/lib/store';

const VoiceCallOverlay = dynamic(
  () => import('@/components/chat/VoiceCallOverlay').then((m) => m.VoiceCallOverlay),
  { ssr: false }
);

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

/** Global voice layer — chat socket connects only after socket-connect-policy allows. */
export function GlobalVoiceCallLayer() {
  useChatSocket();
  useVoiceCallSignaling();

  useEffect(() => {
    const onChatIntent = () => allowChatSocketConnect();
    window.addEventListener('niaz:chat-intent', onChatIntent);
    return () => window.removeEventListener('niaz:chat-intent', onChatIntent);
  }, []);

  return <VoiceCallOverlayWhenActive />;
}
