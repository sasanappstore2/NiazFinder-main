'use client';

import Link from 'next/link';
import { MapPin, Sparkles, ExternalLink } from 'lucide-react';
import type { NeedCardSnapshot } from '@/contracts/need-card-snapshot';
import { routeBuilder } from '@/config/routes';
import { formatBudgetRange } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NeedLeadCardProps {
  need: NeedCardSnapshot;
  isOwn?: boolean;
  className?: string;
}

export function NeedLeadCard({ need, isOwn, className }: NeedLeadCardProps) {
  const href = routeBuilder.need(need.id, need.title);
  const budget =
    need.budgetMin != null || need.budgetMax != null
      ? formatBudgetRange(need.budgetMin, need.budgetMax)
      : null;

  return (
    <div
      className={cn(
        'max-w-sm rounded-xl border bg-card p-4 shadow-sm',
        isOwn ? 'border-primary/20' : 'border-emerald-200/60 dark:border-emerald-800/40',
        className
      )}
      dir="rtl"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="secondary" className="gap-1 text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Sparkles className="size-3" />
          نیاز جدید
        </Badge>
        {need.categoryName && (
          <span className="text-caption text-muted-foreground truncate">{need.categoryName}</span>
        )}
      </div>

      <h4 className="text-body font-semibold leading-snug line-clamp-2">{need.title}</h4>

      {(need.address || need.city) && (
        <p className="mt-2 flex items-start gap-1 text-caption text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            {[need.address, need.city, need.province].filter(Boolean).join('، ')}
          </span>
        </p>
      )}

      {budget && (
        <p className="mt-1 text-caption font-medium text-primary">{budget}</p>
      )}

      {need.matchReasonFa && (
        <p className="mt-2 text-caption text-muted-foreground border-t border-border/50 pt-2">
          {need.matchReasonFa}
        </p>
      )}

      {need.description && (
        <p className="mt-2 text-body-sm text-muted-foreground line-clamp-2">{need.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className="h-8 rounded-lg" asChild>
          <Link href={href}>
            <ExternalLink className="size-3.5 ml-1" />
            مشاهده نیاز
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-lg" asChild>
          <Link href={`${href}#proposal`}>ارسال پیشنهاد</Link>
        </Button>
      </div>
    </div>
  );
}
