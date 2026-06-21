'use client';

import { MessageCircle, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { routeBuilder } from '@/config/routes';

/** Site support CTA — no external phone/WhatsApp. */
export function FloatingCTA() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-[calc(var(--mobile-nav-offset)+3.5rem)] inset-e-4 z-(--z-fixed-overlay) flex flex-col items-end gap-2 lg:inset-e-6">
      {isOpen && (
        <div className="animate-slide-down flex flex-col gap-2 rounded-2xl border border-border/40 bg-card/90 p-3 shadow-xl shadow-black/8 backdrop-blur-xl">
          <Link
            href={routeBuilder.chat()}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <MessageCircle className="size-4" />
            </span>
            پیام‌های من
          </Link>
          <Link
            href={routeBuilder.help()}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
              <HelpCircle className="size-4" />
            </span>
            راهنما و پشتیبانی
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex size-12 items-center justify-center rounded-full shadow-lg transition-all',
          'bg-emerald-600 text-white hover:bg-emerald-700',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? 'بستن منو' : 'منوی کمکی'}
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
