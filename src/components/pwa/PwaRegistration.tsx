'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // Dev: an active SW serves stale cached chunks and breaks HMR — drop any.
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
