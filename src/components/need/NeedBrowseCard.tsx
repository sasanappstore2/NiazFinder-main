'use client';

import Link from 'next/link';
import {
  Clock,
  DollarSign,
  Flame,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { formatRequestBudget } from '@/lib/need/format-need-budget';
import { getTimeAgo, getPriorityLabel } from '@/lib/constants';
import { routeBuilder } from '@/config/routes';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  needBudgetPillClass,
  needCardSurfaceClass,
  priorityAccentClass,
} from './need-browse-card-tokens';
import { extractNeighborhoodLabel } from './briefing/need-brief-utils';

function PriorityBadge({ priority }: { priority: string }) {
  const isUrgent = priority === 'URGENT';
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2 py-0 text-[11px] font-medium',
        isUrgent
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      )}
    >
      <Flame className="size-3" aria-hidden />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

function CategoryPill({
  name,
  href,
}: {
  name: string;
  href?: string;
}) {
  const className =
    'inline-flex max-w-[10rem] truncate rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary';
  if (href) {
    return (
      <Link href={href} prefetch onClick={(e) => e.stopPropagation()} className={className}>
        {name}
      </Link>
    );
  }
  return <span className={className}>{name}</span>;
}

function LocationLine({
  province,
  city,
  neighborhood,
  cityHref,
}: {
  province?: string;
  city?: string;
  neighborhood?: string | null;
  cityHref?: string;
}) {
  if (!province && !city && !neighborhood) return null;

  const segments: Array<{ key: string; text: string; href?: string }> = [];
  if (province?.trim()) segments.push({ key: 'province', text: province.trim() });
  if (city?.trim() && city.trim() !== province?.trim()) {
    segments.push({ key: 'city', text: city.trim(), href: cityHref });
  }
  if (
    neighborhood?.trim() &&
    neighborhood.trim() !== city?.trim() &&
    neighborhood.trim() !== province?.trim()
  ) {
    segments.push({ key: 'neighborhood', text: neighborhood.trim() });
  }

  if (!segments.length) return null;

  return (
    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <MapPin className="size-3.5 shrink-0 opacity-60" aria-hidden />
      <span className="min-w-0 truncate">
        {segments.map((segment, index) => (
          <span key={segment.key}>
            {index > 0 ? (
              <span className="text-muted-foreground/50" aria-hidden>
                {' '}
                ·{' '}
              </span>
            ) : null}
            {segment.href ? (
              <Link
                href={segment.href}
                onClick={(e) => e.stopPropagation()}
                className="truncate transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {segment.text}
              </Link>
            ) : (
              <span className="truncate">{segment.text}</span>
            )}
          </span>
        ))}
      </span>
    </p>
  );
}

export interface NeedBrowseCardProps {
  request: ServiceRequest;
  onClick: () => void;
  dataHref?: string;
  categoryHref?: string;
  cityHref?: string;
  /** Intake preview: no bookmark, no navigation affordance (phase 21). */
  previewMode?: boolean;
  /** Optional deal-type chip shown next to category (intake preview). */
  extraFilterLabel?: string;
}

export function NeedBrowseCard({
  request,
  onClick,
  dataHref,
  categoryHref,
  cityHref,
  previewMode = false,
  extraFilterLabel,
}: NeedBrowseCardProps) {
  const detailHref = dataHref || routeBuilder.listing(request.id, request.title);
  const showPriorityBadge =
    request.priority === 'URGENT' || request.priority === 'HIGH';
  const budgetLabel = formatRequestBudget(request);
  const neighborhoodLabel = extractNeighborhoodLabel(request.address, request.dynamicAnswers);
  const proposalCount = request.proposalCount;

  return (
    <Card
      onClick={previewMode ? undefined : onClick}
      role="article"
      data-href={previewMode ? undefined : detailHref}
      className={cn(
        needCardSurfaceClass,
        priorityAccentClass(request.priority),
        'gap-0! py-0!',
        previewMode && 'pointer-events-none shadow-none'
      )}
    >
      <CardContent className="p-4 sm:p-[1.125rem]">
        {!previewMode ? (
          <BookmarkButton
            itemId={request.id}
            itemType="request"
            size="sm"
            className="touch-target-min absolute left-3 top-3.5 z-10 sm:left-3.5 sm:top-4"
          />
        ) : null}

        <div className={cn('flex flex-col gap-3', !previewMode && 'pl-10 sm:pl-11')}>
          {/* Row 1 — category + priority */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {request.categoryName ? (
              <CategoryPill
                name={request.categoryName}
                href={previewMode ? undefined : categoryHref}
              />
            ) : null}
            {extraFilterLabel ? (
              <span className="inline-flex max-w-[10rem] truncate rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {extraFilterLabel}
              </span>
            ) : null}
            {showPriorityBadge ? <PriorityBadge priority={request.priority} /> : null}
          </div>

          {/* Row 2 — title */}
          <h3 className="text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 sm:text-[1.0625rem]">
            {request.title}
          </h3>

          {/* Row 3 — location */}
          <LocationLine
            province={request.province}
            city={request.city}
            neighborhood={neighborhoodLabel}
            cityHref={cityHref}
          />

          {/* Row 4 — budget + meta footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border/35 pt-3">
            {budgetLabel ? (
              <span className={needBudgetPillClass}>
                <DollarSign className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {budgetLabel}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/70">بودجه توافقی</span>
            )}

            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                {getTimeAgo(request.createdAt)}
              </span>
              {proposalCount > 0 ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-emerald-700/90 dark:text-emerald-400/90">
                  <MessageSquare className="size-3.5 shrink-0" aria-hidden />
                  {proposalCount.toLocaleString('fa-IR')} پیشنهاد
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NeedBrowseCardSkeleton() {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 gap-0! py-0!">
      <CardContent className="p-4 sm:p-[1.125rem]">
        <Skeleton className="absolute left-3 top-3.5 size-9 rounded-full sm:left-3.5 sm:top-4" />
        <div className="flex flex-col gap-3 pl-10 sm:pl-11">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-5 w-[92%] rounded-md" />
          <Skeleton className="h-5 w-[70%] rounded-md sm:hidden" />
          <Skeleton className="h-4 w-36 rounded-md" />
          <div className="flex items-center justify-between gap-3 border-t border-border/35 pt-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
