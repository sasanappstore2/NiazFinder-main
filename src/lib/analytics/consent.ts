export const ANALYTICS_CONSENT_KEY = 'needfinder-cookie-consent';

export type AnalyticsConsent = 'accepted' | 'rejected' | null;

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === 'accepted';
}

export function onAnalyticsConsentChange(callback: (consent: AnalyticsConsent) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_KEY) {
      const value = event.newValue;
      callback(value === 'accepted' || value === 'rejected' ? value : null);
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
