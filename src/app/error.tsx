'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-50 via-background to-emerald-50 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/20 p-4"
    >
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-xl border border-border/50 bg-background/80 p-8 shadow-lg backdrop-blur-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-foreground">
          خطایی رخ داده است
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          متأسفانه در پردازش درخواست شما مشکلی پیش آمده است. لطفاً دوباره
          تلاش کنید یا به صفحه اصلی بازگردید.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            کد خطا: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              صفحه اصلی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
