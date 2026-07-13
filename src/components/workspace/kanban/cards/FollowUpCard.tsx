'use client';

import Link from 'next/link';
import { CalendarClock, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FOLLOW_UP_STAGES, type WorkspaceFollowUpItem } from '../../types';

export function FollowUpCard({
  item,
  dragHandle,
}: {
  item: WorkspaceFollowUpItem;
  dragHandle?: React.ReactNode;
}) {
  const stageLabel =
    FOLLOW_UP_STAGES.find((s) => s.id === item.stage)?.label ?? item.stage;

  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.subject}</p>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {stageLabel}
            </Badge>
          </div>
          {item.customer ? (
            <p className="mt-1 text-[10px] text-muted-foreground">{item.customer}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {item.note ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {item.note}
          </p>
        ) : null}
        {item.nextActionDate ? (
          <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarClock className="size-3" />
            پیگیری: {item.nextActionDate}
          </p>
        ) : null}
        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href={item.needUrl}>
            <ChevronLeft className="size-3.5" />
            جزئیات
          </Link>
        </Button>
      </div>
    </Card>
  );
}
