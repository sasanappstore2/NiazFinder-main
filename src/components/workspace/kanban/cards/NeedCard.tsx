'use client';

import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getTimeAgo } from '@/lib/constants';
import { toPersianDigits } from '@/lib/format/digits';
import type { WorkspaceNeedItem } from '../../types';
import { NeedCardContactRow } from './NeedCardContactRow';

const SOURCE_LABEL: Record<WorkspaceNeedItem['source'], string> = {
  lead: 'لید',
  private: 'ویژه',
  hub: 'بازار',
};

export function NeedCard({
  item,
  dragHandle,
  onAddToFollowUp,
  isInFollowUps,
}: {
  item: WorkspaceNeedItem;
  dragHandle?: React.ReactNode;
  onAddToFollowUp?: (item: WorkspaceNeedItem) => void;
  isInFollowUps?: boolean;
}) {
  const initials = item.userName?.slice(0, 2) ?? 'ن';

  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {SOURCE_LABEL[item.source]}
              </Badge>
              {typeof item.matchScore === 'number' ? (
                <Badge variant="outline" className="h-5 text-[9px] font-normal">
                  {toPersianDigits(Math.round(item.matchScore))}٪ تطابق
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        {item.location ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}
        {item.budget ? (
          <p className="text-xs font-medium text-foreground">{item.budget}</p>
        ) : null}
        {item.matchReasonFa ? (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{item.matchReasonFa}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {item.userAvatar || item.userName ? (
              <Avatar className="size-6">
                {item.userAvatar ? <AvatarImage src={item.userAvatar} alt="" /> : null}
                <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
              </Avatar>
            ) : null}
            {item.userName ? (
              <span className="max-w-[7rem] truncate text-[10px] text-muted-foreground">
                {item.userName}
              </span>
            ) : null}
            {item.status ? (
              <Badge variant="outline" className="h-5 text-[10px] font-normal">
                {item.status}
              </Badge>
            ) : null}
          </div>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            {getTimeAgo(item.createdAt)}
          </span>
        </div>
      </div>

      <div className="border-t border-border/40 px-2.5 py-2">
        <NeedCardContactRow
          item={item}
          onAddToFollowUp={onAddToFollowUp}
          isInFollowUps={isInFollowUps}
        />
      </div>
    </Card>
  );
}

export function NeedCardSkeleton() {
  return <div className="h-36 animate-pulse rounded-lg border border-border/50 bg-muted/30" />;
}

export function needCardSearchText(item: WorkspaceNeedItem): string {
  return [item.title, item.location, item.budget, item.matchReasonFa].filter(Boolean).join(' ');
}
