'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Circle Constants ============
const SIZE = 48;
const STROKE = 3;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;

      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

        setIsVisible(scrollTop > 400);
        setProgress(pct);
        tickingRef.current = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const offset = CIRCUMFERENCE - progress * CIRCUMFERENCE;
  const pctText = Math.round(progress * 100);

  return (
    <button
      onClick={scrollToTop}
      aria-label={pctText > 0 ? `بازگشت به بالا - ${pctText}%` : 'بازگشت به بالا'}
      className={cn(
        'back-to-top-progress',
        'flex items-center justify-center',
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-4 scale-90 pointer-events-none',
      )}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block"
        aria-hidden="true"
      >
        {/* Track circle */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="oklch(0.51 0.12 165 / 0.15)"
          strokeWidth={STROKE}
        />
        {/* Progress circle */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="oklch(0.51 0.12 165)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="back-to-top-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isVisible && pctText > 5 ? (
          <span className="text-caption font-bold leading-none" style={{ color: 'oklch(0.51 0.12 165)' }}>
            {pctText.toLocaleString('fa-IR')}
            <span className="text-[7px]">٪</span>
          </span>
        ) : (
          <ArrowUp className="size-4" style={{ color: 'oklch(0.51 0.12 165)' }} />
        )}
      </div>
    </button>
  );
}
