'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { playApplePaySuccessSound } from '@/lib/sounds/apple-pay-success';

interface PublishSuccessOverlayProps {
  message?: string;
}

export function PublishSuccessOverlay({ message = 'آگهی منتشر شد' }: PublishSuccessOverlayProps) {
  useEffect(() => {
    playApplePaySuccessSound();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-5 rounded-3xl border bg-card px-10 py-12 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="intake-success-badge flex size-24 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/30">
          <Check className="intake-success-check size-14 text-emerald-600" strokeWidth={3} aria-hidden />
        </div>
        <p className="text-center text-lg font-semibold text-foreground">{message}</p>
        <p className="text-center text-sm text-muted-foreground">در حال انتقال به آگهی…</p>
      </div>
    </div>
  );
}
