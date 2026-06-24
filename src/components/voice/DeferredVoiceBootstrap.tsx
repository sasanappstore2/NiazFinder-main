'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';

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

function AuthenticatedVoiceBootstrap() {
  const authHydrated = useAppStore((s) => s.authHydrated);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  if (!authHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <DeferredChatSocketBootstrap />
      <GlobalVoiceCallLayer />
    </>
  );
}

/** Deferred chat socket + voice overlay — only for authenticated users. */
export function DeferredVoiceBootstrap() {
  return <AuthenticatedVoiceBootstrap />;
}
