'use client';

import { KanbanColumn } from '../KanbanColumn';
import { FollowUpCard } from '../cards/FollowUpCard';
import { SortableCardShell } from '../SortableCardShell';
import type { WorkspaceFollowUpItem } from '../../types';

export function FollowUpsColumn({
  items,
  fillHeight,
}: {
  items: WorkspaceFollowUpItem[];
  fillHeight?: boolean;
}) {
  return (
    <KanbanColumn
      title="پیگیری"
      count={items.length}
      isEmpty={items.length === 0}
      emptyMessage="کارت پیگیری ندارید. پس از تماس یا بازدید، نیازها را به این ستون منتقل کنید."
      fillHeight={fillHeight}
    >
      {items.map((item) => (
        <SortableCardShell key={item.id} id={item.id}>
          {(dragHandle) => <FollowUpCard item={item} dragHandle={dragHandle} />}
        </SortableCardShell>
      ))}
    </KanbanColumn>
  );
}
