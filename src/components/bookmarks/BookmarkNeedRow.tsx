'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { ExternalLink, Flame, MapPin, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { needBudgetPillClass } from '@/components/need/need-browse-card-tokens';
import { NeedBusinessActions } from '@/components/need/briefing/NeedBusinessActions';
import { formatBudgetRange, getPriorityLabel, getTimeAgo } from '@/lib/constants';
import {
  getEngagementBadgeClass,
  getEngagementLabel,
  type BookmarkNeedItem,
} from '@/lib/bookmarks/types';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';
import { getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface BookmarkNeedRowProps {
  item: BookmarkNeedItem;
  isBusinessUser: boolean;
  onRemoved: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

export function BookmarkNeedRow({
  item,
  isBusinessUser,
  onRemoved,
  onOpenDetail,
}: BookmarkNeedRowProps) {
  const applyBookmarkToggle = useAppStore((s) => s.applyBookmarkToggle);
  const budgetLabel = formatBudgetRange(item.budgetMin ?? undefined, item.budgetMax ?? undefined);
  const ownerName = `${item.user.firstName} ${item.user.lastName}`.trim();
  const engagementLabel = getEngagementLabel(item);
  const engagementClass = getEngagementBadgeClass(item);
  const detailHref = routeBuilder.listing(item.id, item.title);
  const showPriority = item.priority === 'URGENT' || item.priority === 'HIGH';

  const handleRemove = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify({ type: 'request', id: item.id }),
      });
      const data = (await res.json()) as { message?: string; error?: string; isBookmarked?: boolean };
      if (!res.ok) throw new Error(data.error ?? 'خطا در حذف');
      applyBookmarkToggle('request', item.id, false);
      onRemoved(item.id);
      toast.success(data.message ?? 'حذف شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در حذف');
    }
  };

  return (
    <article
      className={cn(
        'group rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-shadow sm:p-4',
        'hover:border-border hover:shadow-md',
        item.engagement.needsFollowUp && 'border-amber-500/30 bg-amber-500/[0.03]'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
          {item.categoryName && (
            <span className="font-semibold text-foreground/80">
              {item.categoryIcon ? `${item.categoryIcon} ` : ''}
              {item.categoryName}
            </span>
          )}
          {item.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {item.city}
            </span>
          )}
          {showPriority && (
            <Badge variant="outline" className="rounded-md px-1.5 py-0 text-overline">
              <Flame className="size-3" aria-hidden />
              {getPriorityLabel(item.priority)}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className={cn('text-overline font-medium', engagementClass)}>
            {engagementLabel}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => void handleRemove(e)}
            aria-label="حذف از علاقه‌مندی‌ها"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        className="mb-2 w-full text-right"
        onClick={() => onOpenDetail(item.id)}
      >
        <h2 className="text-h3 font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h2>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
      </button>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
        {budgetLabel && (
          <span className={cn(needBudgetPillClass, 'text-caption py-1')}>{budgetLabel}</span>
        )}
        <span>{item.proposalCount.toLocaleString('fa-IR')} پیشنهاد</span>
        <span>ذخیره {getTimeAgo(item.bookmarkedAt)}</span>
      </div>

      <div
        className="flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isBusinessUser && item.status === 'OPEN' && item.user.id ? (
          <NeedBusinessActions
            otherUserId={item.user.id}
            requestId={item.id}
            displayName={ownerName || undefined}
            needPreview={{
              title: item.title,
              categoryName: item.categoryName,
              city: item.city ?? undefined,
            }}
            conversationId={item.engagement.conversationId}
            proposalStatus={item.engagement.myProposalStatus}
            compact
            className="flex-1"
          />
        ) : null}

        <Button
          variant={isBusinessUser && item.status === 'OPEN' ? 'ghost' : 'default'}
          size="sm"
          className={cn(
            'h-10 rounded-xl sm:shrink-0',
            isBusinessUser && item.status === 'OPEN' ? 'sm:w-auto' : 'w-full sm:w-auto'
          )}
          asChild
        >
          <Link href={detailHref} onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="size-4 ml-1" aria-hidden />
            مشاهده آگهی
          </Link>
        </Button>
      </div>
    </article>
  );
}
