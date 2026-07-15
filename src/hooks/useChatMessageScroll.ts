'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_PX = 120;

function isNearBottom(viewport: HTMLElement): boolean {
  const { scrollTop, scrollHeight, clientHeight } = viewport;
  return scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_PX;
}

type Options = {
  conversationId: string | null;
  messageCount: number;
  /** When false, scroll listeners are not attached */
  enabled: boolean;
};

/**
 * Auto-scroll only if the user is already near the bottom (reading history stays put).
 */
export function useChatMessageScroll({ conversationId, messageCount, enabled }: Options) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastConvRef = useRef<string | null>(null);
  const lastCountRef = useRef(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const getViewport = useCallback((): HTMLElement | null => {
    return scrollRootRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
  }, []);

  const scrollToBottom = useCallback((smooth: boolean) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setShowScrollToBottom(false);
      return;
    }

    let cleanup: (() => void) | undefined;

    const attach = () => {
      const vp = getViewport();
      if (!vp) return false;

      const onScroll = () => {
        const near = isNearBottom(vp);
        isNearBottomRef.current = near;
        setShowScrollToBottom(!near);
      };
      onScroll();
      vp.addEventListener('scroll', onScroll, { passive: true });

      // Keep the latest message visible when the viewport shrinks/grows —
      // keyboard open/close, composer autoresize, reply bar. Without this the
      // thread stays at the old scrollTop and the last messages slide out of
      // view under the composer (WhatsApp/Telegram re-pin here too).
      let lastHeight = vp.clientHeight;
      const ro = new ResizeObserver(() => {
        const h = vp.clientHeight;
        if (h !== lastHeight) {
          lastHeight = h;
          if (isNearBottomRef.current) {
            vp.scrollTop = vp.scrollHeight;
          }
        }
      });
      ro.observe(vp);

      cleanup = () => {
        vp.removeEventListener('scroll', onScroll);
        ro.disconnect();
      };
      return true;
    };

    if (!attach()) {
      const id = window.setTimeout(() => attach(), 0);
      return () => {
        clearTimeout(id);
        cleanup?.();
      };
    }

    return () => cleanup?.();
  }, [enabled, conversationId, getViewport]);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    if (lastConvRef.current !== conversationId) {
      lastConvRef.current = conversationId;
      lastCountRef.current = 0;
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
    }

    const prev = lastCountRef.current;
    const count = messageCount;
    lastCountRef.current = count;

    if (count === 0) return;

    if (prev === 0 && count > 0) {
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    if (count > prev && isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    } else if (count > prev && !isNearBottomRef.current) {
      setShowScrollToBottom(true);
    }
  }, [messageCount, conversationId, enabled, scrollToBottom]);

  const scrollToBottomForced = useCallback(() => {
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  return { endRef, scrollRootRef, scrollToBottomForced, showScrollToBottom };
}
