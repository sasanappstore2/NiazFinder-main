'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { WORKSPACE_FOLLOWUPS_DROP_ID } from './workspace-dnd';

export function FollowUpsDropZone({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: WORKSPACE_FOLLOWUPS_DROP_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col transition-[box-shadow,background-color]',
        (isOver || highlight) && 'rounded-xl bg-primary/5 ring-2 ring-primary/35 ring-offset-2 ring-offset-background'
      )}
    >
      {children}
    </div>
  );
}
