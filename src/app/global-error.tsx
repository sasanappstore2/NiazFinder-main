'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              خطای سیستمی
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              خطای غیرمنتظره‌ای در سیستم رخ داده است. لطفاً صفحه را رفرش
              کنید.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => reset()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
