'use client';

import Link from 'next/link';
import { MessageCircle, Sparkles, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WorkspaceNeedItem } from '../../types';

const SOURCE_LABEL: Record<WorkspaceNeedItem['source'], string> = {
  private: 'ویژه',
  lead: 'لید',
  hub: 'هاب',
};

export function NeedCard({
  item,
  dragHandle,
}: {
  item: WorkspaceNeedItem;
  dragHandle?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
            <Badge variant="secondary" className="shrink-0 border-0 text-[10px]">
              {SOURCE_LABEL[item.source]}
            </Badge>
          </div>
          {item.matchScore != null ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              تطابق {Math.round(item.matchScore)}٪
              {item.matchReasonFa ? ` · ${item.matchReasonFa}` : ''}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {item.location ? (
          <p className="text-[11px] text-muted-foreground">{item.location}</p>
        ) : null}
        {item.budget ? (
          <p className="text-sm font-semibold">{item.budget}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href={item.needUrl}>مشاهده نیاز</Link>
          </Button>
          {item.chatUrl ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href={item.chatUrl}>
                <MessageCircle className="size-3.5" />
                گفتگو
              </Link>
            </Button>
          ) : null}
        </div>
        {item.isPrivate ? (
          <p className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
            <Sparkles className="size-3" />
            دسترسی ویژه
          </p>
        ) : null}
        {item.userName ? (
          <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <UserRound className="size-3" />
            {item.userName}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
