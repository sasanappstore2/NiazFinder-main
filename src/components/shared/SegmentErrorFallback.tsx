'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Compact in-segment error card — unlike the root error page it renders
 * inside the group layout, so the header/nav stay usable.
 */
export function SegmentErrorFallback({
  error,
  reset,
  title = 'خطایی رخ داده است',
  description = 'در بارگذاری این بخش مشکلی پیش آمد. دوباره تلاش کنید یا به صفحهٔ اصلی بازگردید.',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error('Segment error:', error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[50dvh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-background/80 p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">کد خطا: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              صفحه اصلی
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
