'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { QuickActions } from '@/components/shared/QuickActions';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OnboardingWelcome } from '@/components/shared/OnboardingWelcome';
import { VoiceCallOverlay } from '@/components/chat/VoiceCallOverlay';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    initializeFromStorage().catch(() => {});
  }, [initializeFromStorage]);

  return (
    <ErrorBoundary>
      <div
        className={cn(
          'flex flex-col bg-background text-foreground',
          isChatView && minimalChrome ? 'h-screen overflow-hidden' : 'min-h-screen'
        )}
      >
        <Header />
        <main
          className={cn('flex-1', !isHome && !isChatView && 'pt-6')}
          dir="rtl"
          id="main-content"
          role="main"
        >
          {children}
        </main>
        {!minimalChrome && !isChatView && (
          isHome ? (
            <Footer />
          ) : (
            <div className="mt-auto">
              <Separator />
              <Footer compact />
            </div>
          )
        )}
        <AuthModal />
        <OnboardingWelcome />
        {!minimalChrome && !isChatView && <MobileBottomNav />}
        <CookieConsent />
        <BackToTop />
        <QuickActions />
        <VoiceCallOverlay
          isOpen={false}
          onClose={() => {}}
          targetUser={null}
          callType="incoming"
        />
      </div>
    </ErrorBoundary>
  );
}
