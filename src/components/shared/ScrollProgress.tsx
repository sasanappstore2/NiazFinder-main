'use client';

import { useEffect, useRef } from 'react';

// ============ Scroll Progress Indicator (pure CSS + JS) ============
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;

      rafRef.current = requestAnimationFrame(() => {
        const bar = barRef.current;
        if (!bar) {
          tickingRef.current = false;
          return;
        }

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        const widthPercent = progress * 100;

        bar.style.width = `${widthPercent}%`;
        bar.style.opacity = scrollTop > 100 ? '1' : '0';
        tickingRef.current = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      className="scroll-progress-bar"
      aria-hidden="true"
      role="progressbar"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div ref={barRef} className="scroll-progress-bar-inner" style={{ width: '0%' }} />
    </div>
  );
}
