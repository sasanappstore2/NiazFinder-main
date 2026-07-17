'use client';

import { useEffect } from 'react';

export const REFERRAL_CODE_STORAGE_KEY = 'nf_referral_code';

/** Captures `?ref=CODE` on any first page load and stashes it for signup, even if the
 * user browses a few pages before registering through the auth modal. */
export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref?.trim()) {
      localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, ref.trim());
    }
  }, []);

  return null;
}
