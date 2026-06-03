'use client';

import Link from 'next/link';
import { MapPin, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBudgetRange, getPriorityLabel } from '@/lib/constants';
import { routeBuilder } from '@/config/routes';
import type { NeedBrowseAlertNotificationData } from '@/lib/need-alerts/types';
import { cn } from '@/lib/utils';

interface NeedBrowseNotificationCardProps {
  data: NeedBrowseAlertNotificationData;
  className?: string;
}

export function NeedBrowseNotificationCard({
  data,
  className,
}: NeedBrowseNotificationCardProps) {
  const budgetMin = data.budgetMin ? Number(data.budgetMin) : undefined;
  const budgetMax = data.budgetMax ? Number(data.budgetMax) : undefined;
  const href = routeBuilder.listing(data.requestId, data.requestTitle);

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-xl border border-emerald-500/20 bg-card p-4 shadow-sm transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5',
        className
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-md text-[10px]">
          {data.alertLabel}
        </Badge>
        {data.priority && data.priority !== 'NORMAL' && (
          <Badge variant="outline" className="rounded-md text-[10px]">
            {getPriorityLabel(data.priority)}
          </Badge>
        )}
      </div>
      <h4 className="text-sm font-bold leading-snug text-foreground">{data.requestTitle}</h4>
      {data.requestDescription && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {data.requestDescription}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(budgetMin != null || budgetMax != null) && (
          <span className="inline-flex items-center gap-1">
            <DollarSign className="size-3.5" aria-hidden />
            {formatBudgetRange(budgetMin, budgetMax)}
          </span>
        )}
        {data.city && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {data.city}
            {data.province ? `، ${data.province}` : ''}
          </span>
        )}
        {data.categoryName && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {data.categoryName}
          </span>
        )}
      </div>
    </Link>
  );
}
