'use client';

import { KanbanColumn } from '../KanbanColumn';
import { CollaborationCard } from '../cards/CollaborationCard';
import { SortableCardShell } from '../SortableCardShell';
import type { WorkspaceCollaborationItem } from '../../types';

export function CollaborationsColumn({
  items,
  error,
  onRetry,
  hasServiceArea,
  fillHeight,
}: {
  items: WorkspaceCollaborationItem[];
  error?: string;
  onRetry?: () => void;
  hasServiceArea?: boolean;
  fillHeight?: boolean;
}) {
  const emptyMessage = hasServiceArea
    ? 'همکاری فعالی در مناطق شما ثبت نشده است.'
    : 'برای دیدن همکاری‌های منطقه‌ای، ابتدا مناطق فعالیت را در ستون فایل‌ها تنظیم کنید.';

  return (
    <KanbanColumn
      title="همکاری‌ها"
      count={items.length}
      isEmpty={items.length === 0}
      emptyMessage={emptyMessage}
      error={error}
      onRetry={onRetry}
      fillHeight={fillHeight}
    >
      {items.map((item) => (
        <SortableCardShell key={item.id} id={item.id}>
          {(dragHandle) => <CollaborationCard item={item} dragHandle={dragHandle} />}
        </SortableCardShell>
      ))}
    </KanbanColumn>
  );
}
