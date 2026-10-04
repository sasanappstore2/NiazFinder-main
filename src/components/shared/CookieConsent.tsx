'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ANALYTICS_CONSENT_KEY } from '@/lib/analytics/consent';

const CONSENT_STORAGE_KEY = ANALYTICS_CONSENT_KEY;

type ConsentChoice = 'accepted' | 'rejected' | null;

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY) as ConsentChoice;
      if (!stored) {
        // Small delay so the page loads first
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available, show banner anyway
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Silently fail if localStorage unavailable
    }
    setIsVisible(false);
    toast.success('کوکی‌ها فعال شدند', {
      description: 'تحلیل ترافیک first-party فعال شد.',
    });
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY, newValue: 'accepted' }));
  };

  const handleReject = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'rejected');
    } catch {
      // Silently fail if localStorage unavailable
    }
    setIsVisible(false);
    toast.info('تنظیمات ذخیره شد', {
      description: 'فقط کوکی‌های ضروری فعال هستند.',
    });
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY, newValue: 'rejected' }));
  };

  const handleSettings = () => {
    toast.info('تنظیمات پیشرفته', {
      description: 'این قابلیت به زودی اضافه خواهد شد.',
    });
  };

  return (
    <div
      role="dialog"
      aria-label="تنظیمات کوکی"
      data-open={isVisible ? '' : undefined}
      className={cn(
        'cookie-consent-anchor fixed inset-x-3 z-(--z-overlay) mx-auto max-w-lg',
        'transition-all duration-150 ease-in-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0 pointer-events-none',
      )}
      dir="rtl"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/80 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-6">
        {/* Decorative gradient accent */}
        <div className="pointer-events-none absolute -top-20 -left-20 size-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 size-40 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground leading-relaxed">
                  حریم خصوصی شما برای ما مهم است
                </h3>
              </div>
            </div>
            <button
              onClick={handleReject}
              className="mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="بستن"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
            ما از کوکی‌ها برای بهبود تجربه کاربری، تحلیل ترافیک و ارائه محتوای شخصی‌سازی شده
            استفاده می‌کنیم. با ادامه استفاده از سایت، با{' '}
            <Link href="/privacy" className="font-medium text-foreground hover:text-primary hover:underline">
              سیاست حریم خصوصی
            </Link>{' '}
            ما موافقت می‌کنید.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                onClick={handleAccept}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                قبول همه کوکی‌ها
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="w-full sm:w-auto"
              >
                فقط کوکی‌های ضروری
              </Button>
            </div>
            <button
              onClick={handleSettings}
              className="flex h-8 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary sm:text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <Settings className="size-3.5" />
              تنظیمات پیشرفته
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
