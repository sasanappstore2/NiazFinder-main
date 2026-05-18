'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
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

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const initializeFromStorage = useAppStore((state) => state.initializeFromStorage);
  const isHome = pathname === '/';

  useEffect(() => {
    initializeFromStorage().catch(() => {});
  }, [initializeFromStorage]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <Suspense fallback={<PageLoadingFallback />}>
          <main className={`flex-1 ${isHome ? '' : 'pt-6'}`} dir="rtl">
            {children}
          </main>
        </Suspense>
        {isHome ? (
          <Footer />
        ) : (
          <div className="mt-auto">
            <Separator />
            <Footer compact />
          </div>
        )}
        <AuthModal />
        <OnboardingWelcome />
        <MobileBottomNav />
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
