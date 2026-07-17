'use client';

import Link from 'next/link';
import { Eye, MapPin, Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';
import type { WorkspaceFileItem } from '../../types';

const COLOR_LABEL_CLASS: Record<string, string> = {
  فروش: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  اجاره: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  رهن: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  زمین: 'bg-stone-500/10 text-stone-700 dark:text-stone-300',
  ویلا: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
};

export function PropertyCard({
  item,
  dragHandle,
}: {
  item: WorkspaceFileItem;
  dragHandle?: React.ReactNode;
}) {
  const labelClass = COLOR_LABEL_CLASS[item.colorLabel] ?? 'bg-muted text-muted-foreground';
  const detailUrl = item.detailUrl?.trim() || null;

  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.listing.title}</p>
            <Badge className={cn('shrink-0 border-0 text-[10px]', labelClass)}>
              {item.colorLabel}
            </Badge>
          </div>
          {item.sourceProvider === 'پروفایل من' ? (
            <p className="mt-1 text-[10px] text-muted-foreground">پروفایل من</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {item.priceDisplay ? (
          <p className="text-sm font-semibold text-foreground">{item.priceDisplay}</p>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {item.listing.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {item.listing.location}
            </span>
          ) : null}
          {item.listing.area ? (
            <span className="inline-flex items-center gap-1">
              <Ruler className="size-3" />
              {toPersianDigits(item.listing.area)} متر
            </span>
          ) : null}
        </div>

        <div className="pt-1">
          {detailUrl ? (
            <Button variant="outline" size="sm" className="h-7 w-full text-xs" asChild>
              <Link href={detailUrl}>
                <Eye className="size-3.5 ml-1" />
                مشاهده فایل
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 w-full text-xs" disabled>
              <Eye className="size-3.5 ml-1" />
              مشاهده فایل
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PropertyCardSkeleton() {
  return <div className="h-32 animate-pulse rounded-lg border border-border/50 bg-muted/30" />;
}
