'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CONSENT_STORAGE_KEY = 'needfinder-cookie-consent';

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
      description: 'تنظیمات کوکی شما ذخیره شد.',
    });
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
  };

  const handleSettings = () => {
    toast.info('تنظیمات پیشرفته', {
      description: 'این قابلیت به زودی اضافه خواهد شد.',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 inset-x-3 z-40 mx-auto max-w-lg sm:bottom-6 lg:hidden"
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
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-relaxed">
                      🍪 حریم خصوصی شما برای ما مهم است
                    </h3>
                  </div>
                </div>
                <button
                  onClick={handleReject}
                  className="mt-0.5 shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                ما از کوکی‌ها برای بهبود تجربه کاربری، تحلیل ترافیک و ارائه محتوای شخصی‌سازی شده
                استفاده می‌کنیم. با ادامه استفاده از سایت، با{' '}
                <span className="font-medium text-foreground">سیاست حریم خصوصی</span> ما موافقت
                می‌کنید.
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
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary sm:text-sm"
                >
                  <Settings className="size-3.5" />
                  تنظیمات پیشرفته
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
