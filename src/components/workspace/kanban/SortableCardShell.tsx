'use client';

import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SortableCardShell({
  id,
  children,
  dragLabel = 'جابجایی',
}: {
  id: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
  /** Accessible label for the drag handle. */
  dragLabel?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={cn(
        'touch-none cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing',
        isDragging && 'cursor-grabbing'
      )}
      aria-label={dragLabel}
      title={dragLabel}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full min-w-0',
        isDragging && 'relative z-50 opacity-35',
        isSorting && !isDragging && 'z-10'
      )}
    >
      {children(handle)}
    </div>
  );
}
