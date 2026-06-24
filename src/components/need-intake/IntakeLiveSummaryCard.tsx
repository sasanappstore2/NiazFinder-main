'use client';

import { MapPin, Sparkles, Wallet, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LiveSummaryCard } from '@/lib/need-intake/question-engine';

export type LiveSummaryCardData =
  | { kind: 'empty' }
  | { kind: 'gist'; text: string }
  | ({ kind: 'card' } & LiveSummaryCard);

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
      <span className="block text-[0.6875rem] text-muted-foreground">{label}</span>
      <span className="block truncate text-xs font-bold text-foreground persian-nums" title={value}>
        {value}
      </span>
    </div>
  );
}

export function IntakeLiveSummaryCard({
  data,
  emptyHint,
  className,
}: {
  data: LiveSummaryCardData;
  emptyHint: string;
  className?: string;
}) {
  if (data.kind === 'empty') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-6 text-center',
          className
        )}
      >
        <Sparkles className="size-5 text-muted-foreground/60" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  if (data.kind === 'gist') {
    return (
      <div className={cn('intake-listing-preview-card', className)}>
        <div className="intake-listing-preview-card__media intake-listing-preview-card__media--compact">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        </div>
        <div className="intake-listing-preview-card__body">
          <p className="text-right text-sm font-medium leading-snug text-foreground">{data.text}</p>
        </div>
      </div>
    );
  }

  const {
    categoryLabel = '',
    dealLabel,
    title = '',
    place,
    budgetLabel,
    urgent = false,
    facts = [],
    detailsText,
  } = data;

  return (
    <div className={cn('intake-listing-preview-card', className)}>
      <div className="intake-listing-preview-card__media intake-listing-preview-card__media--compact">
        <Sparkles className="size-4" aria-hidden />
        <span>خلاصه زنده</span>
      </div>
      <div className="intake-listing-preview-card__body">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            {categoryLabel}
          </Badge>
          {dealLabel ? (
            <Badge variant="outline" className="text-xs font-normal">
              {dealLabel}
            </Badge>
          ) : null}
          {urgent ? (
            <Badge className="gap-1 bg-amber-500/15 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Zap className="size-3" aria-hidden />
              فوری
            </Badge>
          ) : null}
        </div>

        <p className="overflow-guard text-base font-bold leading-snug text-foreground">{title}</p>

        {place ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        ) : null}

        {budgetLabel ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
            <Wallet className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <span className="text-sm font-bold text-emerald-800 persian-nums dark:text-emerald-300">
              {budgetLabel}
            </span>
          </div>
        ) : null}

        {facts.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {facts.slice(0, 6).map((f) => (
              <FactCell key={`${f.label}:${f.value}`} label={f.label} value={f.value} />
            ))}
          </div>
        ) : null}

        {detailsText ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{detailsText}</p>
        ) : null}
      </div>
    </div>
  );
}
