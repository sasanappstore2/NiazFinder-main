'use client';

import { KanbanColumn } from '../KanbanColumn';
import { NeedCard } from '../cards/NeedCard';
import { SortableCardShell } from '../SortableCardShell';
import type { WorkspaceNeedItem } from '../../types';

export function NeedsColumn({
  items,
  error,
  onRetry,
  emptyMessage,
  onAddToFollowUp,
  trackedSourceIds,
  fillHeight,
}: {
  items: WorkspaceNeedItem[];
  error?: string;
  onRetry?: () => void;
  emptyMessage: string;
  onAddToFollowUp?: (item: WorkspaceNeedItem) => void;
  trackedSourceIds?: Set<string>;
  fillHeight?: boolean;
}) {
  return (
    <KanbanColumn
      title="نیازهای مرتبط"
      count={items.length}
      isEmpty={items.length === 0}
      emptyMessage={emptyMessage}
      error={error}
      onRetry={onRetry}
      fillHeight={fillHeight}
    >
      {items.map((item) => (
        <SortableCardShell key={item.id} id={item.id} dragLabel="کشیدن به پیگیری‌ها">
          {(dragHandle) => (
            <NeedCard
              item={item}
              dragHandle={dragHandle}
              onAddToFollowUp={onAddToFollowUp}
              isInFollowUps={trackedSourceIds?.has(item.requestId)}
            />
          )}
        </SortableCardShell>
      ))}
    </KanbanColumn>
  );
}
