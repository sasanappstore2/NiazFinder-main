'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from '../KanbanColumn';
import { CollaborationCard } from '../cards/CollaborationCard';
import { SortableCardShell } from '../SortableCardShell';
import { followUpSourceId } from '@/lib/business/workspace/follow-up-source';
import type { WorkspaceCollaborationItem } from '../../types';

export function CollaborationsColumn({
  items,
  error,
  onRetry,
  emptyMessage,
  hasServiceArea,
  onCreate,
  fillHeight,
  onAddToFollowUp,
  trackedSourceIds,
}: {
  items: WorkspaceCollaborationItem[];
  error?: string;
  onRetry?: () => void;
  emptyMessage: string;
  hasServiceArea: boolean;
  onCreate?: () => void;
  fillHeight?: boolean;
  onAddToFollowUp?: (item: WorkspaceCollaborationItem) => void;
  trackedSourceIds?: Set<string>;
}) {
  const defaultEmpty = hasServiceArea
    ? 'همکاری منطقه‌ای ثبت نشده — با + یک درخواست کوتاه بگذارید.'
    : 'برای دیدن و ثبت همکاری، محدوده خدمات خود را تنظیم کنید.';

  return (
    <KanbanColumn
      title="همکاری‌ها"
      count={items.length}
      isEmpty={items.length === 0}
      emptyMessage={emptyMessage || defaultEmpty}
      error={error}
      onRetry={onRetry}
      fillHeight={fillHeight}
      headerAction={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label="ثبت همکاری جدید"
          onClick={onCreate}
        >
          <Plus className="size-4" />
        </Button>
      }
    >
      {items.map((item) => (
        <SortableCardShell key={item.id} id={item.id} dragLabel="کشیدن به پیگیری‌ها">
          {(dragHandle) => (
            <CollaborationCard
              item={item}
              dragHandle={dragHandle}
              onAddToFollowUp={onAddToFollowUp}
              isInFollowUps={trackedSourceIds?.has(followUpSourceId(item))}
            />
          )}
        </SortableCardShell>
      ))}
    </KanbanColumn>
  );
}
