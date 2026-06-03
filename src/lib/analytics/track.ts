'use client';

import { hasAnalyticsConsent } from '@/lib/analytics/consent';
import { trackEvent } from '@/lib/analytics/collector';

/** Track a custom analytics event when consent is granted. */
export function trackAnalyticsEvent(
  name: string,
  properties?: Record<string, unknown>,
  options?: { userId?: string; path?: string }
): void {
  if (!hasAnalyticsConsent()) return;
  trackEvent(name, properties, { consent: true, ...options });
}
