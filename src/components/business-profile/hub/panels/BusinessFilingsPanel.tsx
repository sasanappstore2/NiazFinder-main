'use client';

import Link from 'next/link';
import { ExternalLink, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';

export function BusinessFilingsPanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          میزکار کامل با چهار ستون نیازها، فایل‌ها، همکاری و پیگیری
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={routeBuilder.workspace()}>
            <ExternalLink className="size-3.5" />
            باز کردن تمام‌صفحه
          </Link>
        </Button>
      </div>
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
        <LayoutGrid className="mx-auto mb-3 size-8 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">
          برای درگ‌اند‌دراپ به پیگیری، یادداشت و مدیریت کارت‌ها، میزکار را تمام‌صفحه باز کنید.
        </p>
        <Button className="mt-4" size="sm" asChild>
          <Link href={routeBuilder.workspace()}>رفتن به میزکار</Link>
        </Button>
      </div>
    </div>
  );
}
