'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { hasAnalyticsConsent, onAnalyticsConsentChange } from '@/lib/analytics/consent';
import { trackEvent, trackPageView } from '@/lib/analytics/collector';
import { useAppStore } from '@/lib/store';

export function useAnalyticsPageview() {
  const pathname = usePathname();
  const currentUser = useAppStore((s) => s.currentUser);
  const consentRef = useRef(hasAnalyticsConsent());
  const enteredAtRef = useRef<number>(Date.now());

  useEffect(() => {
    return onAnalyticsConsentChange((choice) => {
      consentRef.current = choice === 'accepted';
    });
  }, []);

  useEffect(() => {
    enteredAtRef.current = Date.now();

    if (consentRef.current) {
      trackPageView({
        path: pathname,
        consent: true,
        userId: currentUser?.id,
      });
    }

    const flushDuration = () => {
      if (!consentRef.current) return;
      const durationMs = Date.now() - enteredAtRef.current;
      if (durationMs < 500) return;
      trackEvent(
        'page_duration',
        { path: pathname, durationMs },
        { consent: true, userId: currentUser?.id, path: pathname }
      );
    };

    const onHide = () => {
      if (document.visibilityState === 'hidden') flushDuration();
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushDuration);

    return () => {
      flushDuration();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushDuration);
    };
  }, [pathname, currentUser?.id]);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useAnalyticsPageview();
  return <>{children}</>;
}
