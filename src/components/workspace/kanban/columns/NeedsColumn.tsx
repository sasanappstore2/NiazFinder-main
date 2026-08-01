'use client';

import { KanbanColumn } from '../KanbanColumn';
import { NeedCard } from '../cards/NeedCard';
import { SortableCardShell } from '../SortableCardShell';
import type { WorkspaceNeedItem } from '../../types';

export function NeedsColumn({
  items,
  error,
  onRetry,
  fillHeight,
}: {
  items: WorkspaceNeedItem[];
  error?: string;
  onRetry?: () => void;
  fillHeight?: boolean;
}) {
  return (
    <KanbanColumn
      title="نیازها و لیدها"
      count={items.length}
      isEmpty={items.length === 0}
      emptyMessage="نیاز یا لید جدیدی در صف شما نیست. لیدهای هوشمند پس از تطابق اینجا نمایش داده می‌شوند."
      error={error}
      onRetry={onRetry}
      fillHeight={fillHeight}
    >
      {items.map((item) => (
        <SortableCardShell key={item.id} id={item.id}>
          {(dragHandle) => <NeedCard item={item} dragHandle={dragHandle} />}
        </SortableCardShell>
      ))}
    </KanbanColumn>
  );
}
