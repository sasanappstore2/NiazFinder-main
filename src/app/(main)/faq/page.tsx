'use client';

import { useEffect } from 'react';

/** Legacy `/faq` → homepage FAQ section. */
export default function FaqRedirectPage() {

  useEffect(() => {
    window.location.replace('/#faq');
  }, []);

  return null;
}
