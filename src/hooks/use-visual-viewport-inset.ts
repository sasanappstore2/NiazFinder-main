'use client';

import { useEffect } from 'react';

export type VisualViewportInsetOptions = {
  /** When true, sync CSS vars and neutralize iOS scroll-into-view. */
  enabled?: boolean;
  /** Lock document scroll (recommended on mobile chat). */
  lockDocumentScroll?: boolean;
};

/**
 * Pins chat UI to the visual viewport (keyboard-safe).
 *
 * Uses bottom-anchoring (`--vv-bottom` + `--vv-height`) so the shell sits
 * flush above the keyboard. Never combine with extra keyboard padding.
 * Sets `data-vv-kb="1"` when the soft keyboard is open (for safe-area CSS).
 */
export function useVisualViewportInset({
  enabled = true,
  lockDocumentScroll = false,
}: VisualViewportInsetOptions = {}): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;

    const prevHtmlOverflow = root.style.overflow;
    const prevHtmlOverscroll = root.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyHeight = body.style.height;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;

    if (lockDocumentScroll) {
      root.style.overflow = 'hidden';
      root.style.overscrollBehavior = 'none';
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      // Hard-pin body so iOS focus scroll cannot shift the page.
      body.style.position = 'fixed';
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.top = '0';
      body.style.left = '0';
    }

    let raf = 0;
    let trackRaf = 0;
    let trackUntil = 0;

    const syncNow = () => {
      // While pinch-zoomed, vv.height is the zoomed-in slice — resizing the
      // shell to it would collapse the UI. Keep the last full-scale values.
      if (vv && vv.scale > 1.02) return;

      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }

      const layoutH = window.innerHeight;
      const height = vv?.height ?? layoutH;
      const offsetTop = vv?.offsetTop ?? 0;
      const bottom = Math.max(0, layoutH - offsetTop - height);
      // Soft keyboard typically claims > 120px; ignore tiny chrome jitter.
      const keyboardOpen = bottom > 120 || height < layoutH * 0.75;

      root.style.setProperty('--vv-height', `${Math.round(height)}px`);
      root.style.setProperty('--vv-bottom', `${Math.round(bottom)}px`);
      root.style.setProperty('--vv-top', `${Math.round(offsetTop)}px`);
      root.dataset.vvKb = keyboardOpen ? '1' : '0';
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncNow);
    };

    /**
     * Follow the keyboard show/hide animation frame-by-frame: iOS/Android
     * animate the viewport over ~250–400ms but fire few (or late) vv events,
     * so a one-shot sync leaves the shell mispositioned until the end — the
     * visible "jump". A short rAF burst keeps it glued to the keyboard.
     */
    const trackLoop = () => {
      syncNow();
      if (performance.now() < trackUntil) {
        trackRaf = requestAnimationFrame(trackLoop);
      }
    };
    const trackFor = (ms: number) => {
      trackUntil = Math.max(trackUntil, performance.now() + ms);
      cancelAnimationFrame(trackRaf);
      trackRaf = requestAnimationFrame(trackLoop);
    };

    // vv resize also fires on keyboard *hide* — track that animation too.
    const onVvResize = () => trackFor(450);

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable
      ) {
        window.scrollTo(0, 0);
        trackFor(650);
      }
    };

    syncNow();
    vv?.addEventListener('resize', onVvResize);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(trackRaf);
      trackUntil = 0;
      vv?.removeEventListener('resize', onVvResize);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('focusin', onFocusIn);
      root.style.removeProperty('--vv-top');
      root.style.removeProperty('--vv-height');
      root.style.removeProperty('--vv-bottom');
      root.style.removeProperty('--keyboard-inset');
      delete root.dataset.vvKb;
      if (lockDocumentScroll) {
        root.style.overflow = prevHtmlOverflow;
        root.style.overscrollBehavior = prevHtmlOverscroll;
        body.style.overflow = prevBodyOverflow;
        body.style.overscrollBehavior = prevBodyOverscroll;
        body.style.position = prevBodyPosition;
        body.style.width = prevBodyWidth;
        body.style.height = prevBodyHeight;
        body.style.top = prevBodyTop;
        body.style.left = prevBodyLeft;
      }
    };
  }, [enabled, lockDocumentScroll]);
}
