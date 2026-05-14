'use client';

import { Phone, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function FloatingCTA() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 end-4 z-[var(--z-fixed-overlay)] sm:bottom-6 sm:end-6 flex flex-col items-end gap-2">
      {/* Quick actions popup */}
      {isOpen && (
        <div className="animate-slide-down flex flex-col gap-2 rounded-2xl border border-border/40 bg-card/90 p-3 shadow-xl shadow-black/[0.08] backdrop-blur-xl">
          <a
            href="tel:+982191000000"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            title="تماس تلفنی"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <Phone className="size-4" />
            </span>
            تماس تلفنی
          </a>
          <a
            href="https://wa.me/989123456789"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-green-500/10 hover:text-green-600"
            title="پیام در واتساپ"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-green-500 text-white shadow-md shadow-green-500/25">
              <MessageCircle className="size-4" />
            </span>
            واتساپ
          </a>
        </div>
      )}

      {/* Main FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          isOpen
            ? 'bg-foreground text-background rotate-45'
            : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white animate-emerald-glow',
        )}
        aria-label={isOpen ? 'بستن منوی تماس' : 'تماس با ما'}
        title={isOpen ? 'بستن' : 'تماس تلفنی یا واتساپ'}
      >
        {isOpen ? (
          <X className="size-5" />
        ) : (
          <Phone className="size-6" />
        )}
      </button>
    </div>
  );
}
