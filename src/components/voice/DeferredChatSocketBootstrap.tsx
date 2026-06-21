'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { allowChatSocketConnect } from '@/lib/chat/socket-connect-policy';
import { useAppStore } from '@/lib/store';

/** Connect chat socket: immediately when logged in; defer for guests (LCP). */
export function DeferredChatSocketBootstrap() {
  const pathname = usePathname();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      allowChatSocketConnect();
      return;
    }

    if (pathname.startsWith('/chat') || pathname.startsWith('/messages')) {
      allowChatSocketConnect();
      return;
    }

    const onInteract = () => {
      allowChatSocketConnect();
    };

    window.addEventListener('pointerdown', onInteract, { once: true, passive: true });
    window.addEventListener('keydown', onInteract, { once: true });

    const idleId =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(() => allowChatSocketConnect(), { timeout: 8000 })
        : window.setTimeout(() => allowChatSocketConnect(), 4000);

    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      if (typeof cancelIdleCallback !== 'undefined' && typeof idleId === 'number') {
        cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as number);
      }
    };
  }, [pathname, isAuthenticated]);

  return null;
}
