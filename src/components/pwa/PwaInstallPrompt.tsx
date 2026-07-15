'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'nf-pwa-install-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ask again after 30 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Android/Chrome A2HS prompt — fires only where the browser supports
 * `beforeinstallprompt` (iOS Safari never does; it has its own Share→Add flow).
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (at && Date.now() - at < DISMISS_TTL_MS) return;
      } catch {
        /* private mode */
      }
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setDeferred(null);
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="نصب اپلیکیشن"
      className="fixed inset-x-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
    >
      <img src="/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">نصب نیاز فایندر</p>
        <p className="truncate text-xs text-muted-foreground">
          دسترسی سریع از صفحهٔ اصلی گوشی
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => {
          void deferred.prompt();
          void deferred.userChoice.finally(dismiss);
        }}
      >
        <Download className="size-4" />
        نصب
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-full"
        aria-label="بستن"
        onClick={dismiss}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
