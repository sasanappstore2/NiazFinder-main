'use client';

import dynamic from 'next/dynamic';

const DeferredChatSocketBootstrap = dynamic(
  () =>
    import('@/components/voice/DeferredChatSocketBootstrap').then(
      (m) => m.DeferredChatSocketBootstrap
    ),
  { ssr: false }
);

const GlobalVoiceCallLayer = dynamic(
  () =>
    import('@/components/voice/GlobalVoiceCallLayer').then((m) => m.GlobalVoiceCallLayer),
  { ssr: false }
);

/** Deferred chat socket + voice overlay — client-only, must not load in root RSC layout. */
export function DeferredVoiceBootstrap() {
  return (
    <>
      <DeferredChatSocketBootstrap />
      <GlobalVoiceCallLayer />
    </>
  );
}
