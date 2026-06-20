'use client';

import { Clock, Eye, Inbox, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPriorityLabel, getStatusLabel, getTimeAgo } from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { extractNeighborhoodLabel, getPriorityConfig, getStatusConfig } from './need-brief-utils';

interface NeedBriefMetaRowProps {
  request: ServiceRequest;
  className?: string;
}

export function NeedBriefMetaRow({ request, className }: NeedBriefMetaRowProps) {
  const showPriorityBadge = request.priority === 'URGENT' || request.priority === 'HIGH';
  const priorityConfig = getPriorityConfig(request.priority);
  const PriorityIcon = priorityConfig.icon;
  const neighborhoodLabel = extractNeighborhoodLabel(request.address, request.dynamicAnswers);

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {request.categoryName && (
          <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-caption font-semibold">
            {request.categoryIcon ? `${request.categoryIcon} ` : ''}
            {request.categoryName}
          </Badge>
        )}
        <Badge variant="outline" className={cn('text-caption', getStatusConfig(request.status))}>
          {getStatusLabel(request.status)}
        </Badge>
        {showPriorityBadge && (
          <Badge
            variant="outline"
            className={cn('text-caption', priorityConfig.className)}
          >
            <PriorityIcon className="size-3" aria-hidden />
            {getPriorityLabel(request.priority)}
          </Badge>
        )}
      </div>

      {(request.city || neighborhoodLabel) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary/80" aria-hidden />
          {request.city && <span>{request.city}</span>}
          {request.city && neighborhoodLabel && (
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
          )}
          {neighborhoodLabel && <span>{neighborhoodLabel}</span>}
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          {getTimeAgo(request.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3.5" aria-hidden />
          {request.viewCount.toLocaleString('fa-IR')} بازدید
        </span>
        <span className="inline-flex items-center gap-1">
          <Inbox className="size-3.5" aria-hidden />
          {request.proposalCount.toLocaleString('fa-IR')} پیشنهاد
        </span>
      </p>
    </div>
  );
}
