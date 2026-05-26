'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { legacyViewToPath } from '@/config/routes';
import { resolveLegacyBrowsePath } from '@/lib/search/browse-entry-url';
import type { AppView } from '@/lib/types';

function viewToPath(view: AppView, params?: Record<string, string>): string {
  if (view === 'browse-requests' || view === 'browse-specialists') {
    return resolveLegacyBrowsePath(view, params);
  }
  return legacyViewToPath(view, params);
}

/** App Router navigation replacing Zustand navigateTo */
export function useNavigate() {
  const router = useRouter();

  const navigateTo = useCallback(
    (view: AppView, params?: Record<string, string>) => {
      router.push(viewToPath(view, params));
    },
    [router]
  );

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return { navigateTo, goBack, push: router.push };
}
