'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { AnalyticsProvider } from '@/hooks/use-analytics-pageview';
import { OnboardingWelcome } from '@/components/shared/OnboardingWelcome';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { isBusinessProductDetailPath, isBusinessProfileAuraPath } from '@/config/routes';
import { cn } from '@/lib/utils';
import { useResumePendingContact } from '@/hooks/use-resume-pending-contact';

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
  const businessProfileAura = isBusinessProfileAuraPath(pathname);
  const effectiveMinimal = minimalChrome || isChatView;
  const hideMobileNav = effectiveMinimal || isProductDetail;

  useResumePendingContact();

  useEffect(() => {
    initializeFromStorage().catch(() => {});
  }, [initializeFromStorage]);

  return (
    <QueryProvider>
      <ErrorBoundary>
        <AnalyticsProvider>
        <div
          className={cn(
            'shell-root flex min-w-0 flex-col text-foreground',
            businessProfileAura ? 'bg-transparent' : 'bg-background',
            effectiveMinimal ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen'
          )}
        >
          <Header compact={effectiveMinimal} />
          <main
            className={cn(
              'relative flex min-h-0 min-w-0 flex-col',
              effectiveMinimal ? 'flex-1 overflow-hidden' : 'flex-1',
              !effectiveMinimal &&
                !isHome &&
                !businessProfileAura &&
                'pt-3 sm:pt-5 md:pt-6',
              !hideMobileNav && 'has-mobile-nav',
              businessProfileAura && 'isolate z-10 bg-transparent'
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
              <div
                className={cn(
                  'mt-auto',
                  businessProfileAura && 'relative z-10'
                )}
              >
                <Separator
                  className={cn(businessProfileAura && 'bg-border/40')}
                />
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
        </div>
        </AnalyticsProvider>
      </ErrorBoundary>
    </QueryProvider>
  );
}
