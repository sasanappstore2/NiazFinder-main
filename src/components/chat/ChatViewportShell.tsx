'use client';

import type { ReactNode } from 'react';
import { useVisualViewportInset } from '@/hooks/use-visual-viewport-inset';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/**
 * Mobile (< md): fixed shell bottom-anchored via CSS + visualViewport vars.
 * Desktop: normal flex fill. Class names are identical on SSR/client (no hydration branch).
 */
export function ChatViewportShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  useVisualViewportInset({
    enabled: isMobile,
    lockDocumentScroll: isMobile,
  });

  return (
    <div
      className={cn(
        'chat-vv-shell flex min-h-0 flex-1 flex-col overflow-hidden bg-background',
        'relative h-full',
        'max-md:fixed max-md:inset-x-0 max-md:bottom-[var(--vv-bottom,0px)]',
        'max-md:z-[var(--z-fixed-overlay,20)]',
        'max-md:h-[var(--vv-height,100dvh)] max-md:max-h-[var(--vv-height,100dvh)]'
      )}
    >
      {children}
    </div>
  );
}
