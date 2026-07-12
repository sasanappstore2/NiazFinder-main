'use client';

import Link from 'next/link';
import { Handshake, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WorkspaceCollaborationItem } from '../../types';

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-700 dark:text-red-400',
  important: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  normal: 'bg-muted text-muted-foreground',
};

export function CollaborationCard({
  item,
  dragHandle,
}: {
  item: WorkspaceCollaborationItem;
  dragHandle?: React.ReactNode;
}) {
  const headline = item.headline ?? item.description ?? item.collaborationType;
  const profileUrl = item.authorSlug ? `/pro/${item.authorSlug}` : null;

  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="flex items-start gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{headline}</p>
            <Badge
              className={cn(
                'shrink-0 border-0 text-[10px]',
                PRIORITY_CLASS[item.priority] ?? PRIORITY_CLASS.normal
              )}
            >
              {item.collaborationType}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{item.businessName}</p>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {item.area ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {item.area}
          </p>
        ) : null}
        {item.dealTypeLabel || item.propertyKindLabel ? (
          <p className="text-[11px] text-muted-foreground">
            {[item.dealTypeLabel, item.propertyKindLabel, item.budgetBandLabel]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {profileUrl ? (
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={profileUrl}>
                <Handshake className="size-3.5" />
                پروفایل
              </Link>
            </Button>
          ) : null}
          {item.hasPhone ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
              <Phone className="size-3" />
              تماس
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
