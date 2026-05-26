'use client';

import Link from 'next/link';
import {
  Clock,
  DollarSign,
  Flame,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { formatBudgetRange, getTimeAgo, getPriorityLabel } from '@/lib/constants';
import { routeBuilder } from '@/config/routes';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  NEED_CARD_GRID_DESKTOP,
  needCardSurfaceClass,
  priorityAccentClass,
} from './need-browse-card-tokens';

function extractNeighborhoodLabel(address?: string): string | null {
  if (!address) return null;
  const cleaned = address.trim();
  if (!cleaned) return null;
  const head = cleaned.split(/[،,\-|–—]/)[0]?.trim();
  if (!head) return null;
  // Avoid duplicating city if address begins with it.
  return head;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: {
      className:
        'bg-destructive/10 text-destructive border-destructive/20',
      icon: Flame,
    },
    HIGH: {
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      icon: Flame,
    },
    NORMAL: {
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
    LOW: {
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
  };
  const c = config[priority] || config.NORMAL;
  const Icon = c.icon;
  return (
    <Badge
      variant="outline"
      className={cn('rounded-md px-1.5 py-0 text-overline font-medium', c.className)}
    >
      <Icon className="size-3" aria-hidden="true" />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

export interface NeedBrowseCardProps {
  request: ServiceRequest;
  onClick: () => void;
  dataHref?: string;
  categoryHref?: string;
  cityHref?: string;
}

export function NeedBrowseCard({
  request,
  onClick,
  dataHref,
  categoryHref,
  cityHref,
}: NeedBrowseCardProps) {
  const detailHref = dataHref || routeBuilder.listing(request.id, request.title);
  const showPriorityBadge =
    request.priority === 'URGENT' || request.priority === 'HIGH';
  const budgetLabel = formatBudgetRange(request.budgetMin, request.budgetMax);
  const neighborhoodLabel = extractNeighborhoodLabel(request.address);

  return (
    <Card
      onClick={onClick}
      role="article"
      data-href={detailHref}
      className={cn(
        needCardSurfaceClass,
        priorityAccentClass(request.priority),
        'gap-0! py-0!'
      )}
    >
      <CardContent className="p-[13px] sm:p-[21px]">
        <div
          className={cn(
            'flex flex-col gap-[13px]',
            NEED_CARD_GRID_DESKTOP
          )}
        >
          {/* Top-left bookmark (visually aligns with category + city meta row) */}
          <BookmarkButton
            itemId={request.id}
            itemType="request"
            size="sm"
            className="touch-target-min absolute left-[13px] top-[13px] sm:left-[21px] sm:top-[21px]"
          />

          {/* Main column — visual hierarchy: meta → title → budget → description */}
          <div className="min-w-0 flex flex-col gap-[13px]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-[56px]">
              {request.categoryName && (
                categoryHref ? (
                  <Link
                    href={categoryHref}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex max-w-48 truncate rounded-md bg-muted/60 px-2 py-0.5 text-overline font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {request.categoryName}
                  </Link>
                ) : (
                  <span className="inline-flex max-w-48 truncate rounded-md bg-muted/60 px-2 py-0.5 text-overline font-semibold text-muted-foreground">
                    {request.categoryName}
                  </span>
                )
              )}
              {request.city && (
                <span className="inline-flex items-center gap-1 text-overline text-muted-foreground">
                  <MapPin className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                  {cityHref ? (
                    <Link
                      href={cityHref}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-emerald-600"
                    >
                      {request.city}
                    </Link>
                  ) : (
                    request.city
                  )}
                  {neighborhoodLabel && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground/50">
                      <span aria-hidden="true">·</span>
                      <span className="max-w-40 truncate text-muted-foreground">
                        {neighborhoodLabel}
                      </span>
                    </span>
                  )}
                </span>
              )}
              {showPriorityBadge && (
                <PriorityBadge priority={request.priority} />
              )}
              <span className="text-overline text-muted-foreground/60 sm:hidden">
                {getTimeAgo(request.createdAt)}
              </span>
            </div>

            <Link
              href={detailHref}
              onClick={(e) => e.stopPropagation()}
              className="text-h3 font-bold leading-snug tracking-tight text-foreground transition-colors line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
            >
              {request.title}
            </Link>

            {budgetLabel && (
              <div className="flex flex-wrap items-center gap-[13px]">
                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-label font-semibold text-emerald-800 persian-nums dark:text-emerald-300">
                  <DollarSign
                    className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {budgetLabel}
                </span>
              </div>
            )}

            {request.description && (
              <p className="text-caption leading-relaxed text-muted-foreground/75 line-clamp-2 sm:line-clamp-1">
                {request.description}
              </p>
            )}
          </div>

          {/* Side column — actions */}
          <div className="flex flex-row items-center justify-between gap-[13px] border-t border-border/40 pt-[13px] sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
            <span className="hidden text-caption text-muted-foreground/70 sm:inline">
              {getTimeAgo(request.createdAt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NeedBrowseCardSkeleton() {
  return (
    <Card className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 gap-0! py-0!">
      <CardContent className="p-[13px] sm:p-[21px]">
        <div className={cn('flex flex-col gap-[13px]', NEED_CARD_GRID_DESKTOP)}>
          <div className="min-w-0 flex flex-col gap-[13px]">
            {/* Bookmark placeholder */}
            <div className="absolute left-[13px] top-[13px] sm:left-[21px] sm:top-[21px]">
              <Skeleton className="h-[44px] w-[44px] rounded-full" />
            </div>

            <div className="flex gap-2 pl-[56px]">
              <Skeleton className="h-[13px] w-20 rounded-md" />
              <Skeleton className="h-[13px] w-16 rounded-md" />
            </div>
            <Skeleton className="h-[21px] w-4/5 rounded-md" />
            <Skeleton className="h-[21px] w-3/5 rounded-md" />
            <Skeleton className="h-[34px] w-40 rounded-xl" />
            <Skeleton className="h-[13px] w-full rounded-md" />
          </div>
          <div className="flex items-center justify-between gap-[13px] border-t border-border/40 pt-[13px] sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <Skeleton className="hidden h-[13px] w-24 rounded-md sm:block sm:w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
