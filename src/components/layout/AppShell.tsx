'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OnboardingWelcome } from '@/components/shared/OnboardingWelcome';
import { VoiceCallOverlay } from '@/components/chat/VoiceCallOverlay';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { isBusinessProductDetailPath } from '@/config/routes';
import { cn } from '@/lib/utils';
import { useResumePendingContact } from '@/hooks/use-resume-pending-contact';
import { useChatSocket } from '@/lib/chat-socket';
import { useVoiceCallSignaling } from '@/hooks/use-voice-call';

interface AppShellProps {
  children: ReactNode;
  /** Hide footer and bottom nav (e.g. chat fullscreen) */
  minimalChrome?: boolean;
}

export function AppShell({ children, minimalChrome = false }: AppShellProps) {
  const pathname = usePathname();
  const initializeFromStorage = useAppStore((state) => state.initializeFromStorage);
  const isHome = pathname === '/';
  const isChatView = pathname.startsWith('/chat');
  const isProductDetail = isBusinessProductDetailPath(pathname);
  const effectiveMinimal = minimalChrome || isChatView;
  const hideMobileNav = effectiveMinimal || isProductDetail;
  const voiceCallOpen = useAppStore((s) => s.voiceCallOpen);
  const voiceCallTarget = useAppStore((s) => s.voiceCallTarget);
  const voiceCallType = useAppStore((s) => s.voiceCallType);
  const hangupVoiceCall = useAppStore((s) => s.hangupVoiceCall);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useResumePendingContact();
  useChatSocket();
  useVoiceCallSignaling();

  useEffect(() => {
    initializeFromStorage().catch(() => {});
  }, [initializeFromStorage]);

  return (
    <QueryProvider>
      <ErrorBoundary>
        <div
          className={cn(
            'flex min-w-0 flex-col bg-background text-foreground',
            effectiveMinimal ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen'
          )}
        >
          <Header compact={effectiveMinimal} />
          <main
            className={cn(
              'flex min-h-0 min-w-0 flex-col',
              effectiveMinimal ? 'flex-1 overflow-hidden' : 'flex-1',
              !effectiveMinimal && !isHome && 'pt-3 sm:pt-5 md:pt-6',
              !hideMobileNav && 'has-mobile-nav'
            )}
            dir="rtl"
            id="main-content"
            role="main"
          >
            {children}
          </main>
          {!effectiveMinimal &&
            (isHome ? (
              <Footer />
            ) : (
              <div className="mt-auto">
                <Separator />
                <Footer compact />
              </div>
            ))}
          <AuthModal />
          <OnboardingWelcome />
          {!hideMobileNav && (
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
          )}
          <CookieConsent />
          {!effectiveMinimal && !isProductDetail && <BackToTop />}
          <VoiceCallOverlay
            isOpen={voiceCallOpen}
            onClose={hangupVoiceCall}
            targetUser={voiceCallTarget}
            callType={voiceCallType}
          />
        </div>
      </ErrorBoundary>
    </QueryProvider>
  );
}
