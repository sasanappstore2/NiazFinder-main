'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimation,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FollowUpsDropZone } from './FollowUpsDropZone';
import { NeedsColumn } from './columns/NeedsColumn';
import { RegionalFilingsColumn } from './columns/RegionalFilingsColumn';
import { CollaborationsColumn } from './columns/CollaborationsColumn';
import { FollowUpsColumn } from './columns/FollowUpsColumn';
import { KanbanColumnSkeleton } from './KanbanColumn';
import { NeedCard } from './cards/NeedCard';
import { PropertyCard } from './cards/PropertyCard';
import { CollaborationCard } from './cards/CollaborationCard';
import { WORKSPACE_FOLLOWUPS_DROP_ID } from './workspace-dnd';
import { followUpSourceId, type WorkspaceFollowUpCandidate } from '@/lib/business/workspace/follow-up-source';
import type {
  FollowUpStageId,
  WorkspaceCollaborationItem,
  WorkspaceColumnErrors,
  WorkspaceColumnId,
  WorkspaceFileItem,
  WorkspaceFollowUpItem,
  WorkspaceNeedItem,
  WorkspaceRegionalFeedMeta,
} from '../types';

type ColumnKey = 'needs' | 'files' | 'collaborations';

type DragKind = 'need' | 'file' | 'collaboration';
type ActiveDrag = { kind: DragKind; id: string } | null;

const DRAG_OVERLAY_DROP_ANIMATION: DropAnimation = {
  ...defaultDropAnimation,
  duration: 220,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
};

function DragOverlayShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-[min(100%,280px)] cursor-grabbing scale-[1.02] rotate-1 shadow-xl ring-2 ring-primary/15">
      {children}
    </div>
  );
}

function columnShell(tab: WorkspaceColumnId, activeTab: WorkspaceColumnId, className?: string) {
  return cn(
    'flex min-h-0 min-w-0 flex-col',
    activeTab !== tab ? 'hidden lg:flex' : 'flex min-h-0 flex-1 flex-col',
    className
  );
}

function collisionDetection(args: Parameters<typeof closestCenter>[0]) {
  const pointerHits = pointerWithin(args);
  const followUpHit = pointerHits.find((c) => c.id === WORKSPACE_FOLLOWUPS_DROP_ID);
  if (followUpHit) return [followUpHit];
  return closestCenter(args);
}

export function KanbanBoard({
  activeTab,
  needs,
  files,
  regionalFeed,
  collaborations,
  collaborationHasServiceArea,
  followUps,
  loading,
  errors,
  onRetry,
  onAddToFollowUp,
  trackedSourceIds,
  onFollowUpStageChange,
  onFollowUpAppendNote,
  onFollowUpSetReminder,
  onFollowUpClearReminder,
  onFollowUpRemove,
  onCreateCollaboration,
  businessCity,
  onAreasSaved,
}: {
  activeTab: WorkspaceColumnId;
  needs: WorkspaceNeedItem[];
  files: WorkspaceFileItem[];
  regionalFeed: WorkspaceRegionalFeedMeta;
  collaborations: WorkspaceCollaborationItem[];
  collaborationHasServiceArea: boolean;
  followUps: WorkspaceFollowUpItem[];
  loading: boolean;
  errors: WorkspaceColumnErrors;
  onRetry?: () => void;
  onAddToFollowUp?: (item: WorkspaceFollowUpCandidate) => void;
  trackedSourceIds?: Set<string>;
  onFollowUpStageChange?: (followUpId: string, stage: FollowUpStageId) => void;
  onFollowUpAppendNote?: (followUpId: string, text: string) => void;
  onFollowUpSetReminder?: (
    followUpId: string,
    preset: import('@/lib/business/workspace/follow-up-stage-actions').FollowUpQuickReminderPreset
  ) => void;
  onFollowUpClearReminder?: (followUpId: string) => void;
  onFollowUpRemove?: (followUpId: string) => void;
  onCreateCollaboration?: () => void;
  businessCity?: string;
  onAreasSaved?: () => void;
}) {
  const [order, setOrder] = useState<Record<ColumnKey, string[]>>({
    needs: [],
    files: [],
    collaborations: [],
  });
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);

  useEffect(() => {
    setOrder({
      needs: needs.map((n) => n.id),
      files: files.map((f) => f.id),
      collaborations: collaborations.map((c) => c.id),
    });
  }, [needs, files, collaborations]);

  const needsById = useMemo(() => new Map(needs.map((n) => [n.id, n])), [needs]);
  const filesById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);
  const collabById = useMemo(
    () => new Map(collaborations.map((c) => [c.id, c])),
    [collaborations]
  );

  const orderedNeeds = order.needs
    .map((id) => needsById.get(id))
    .filter((n): n is WorkspaceNeedItem => Boolean(n));
  const orderedFiles = order.files
    .map((id) => filesById.get(id))
    .filter((f): f is WorkspaceFileItem => Boolean(f));
  const orderedCollabs = order.collaborations
    .map((id) => collabById.get(id))
    .filter((c): c is WorkspaceCollaborationItem => Boolean(c));

  const draggingNeed =
    activeDrag?.kind === 'need' ? needsById.get(activeDrag.id) : undefined;
  const draggingFile =
    activeDrag?.kind === 'file' ? filesById.get(activeDrag.id) : undefined;
  const draggingCollab =
    activeDrag?.kind === 'collaboration' ? collabById.get(activeDrag.id) : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (order.needs.includes(id)) {
      setActiveDrag({ kind: 'need', id });
      return;
    }
    if (order.files.includes(id)) {
      setActiveDrag({ kind: 'file', id });
      return;
    }
    if (order.collaborations.includes(id)) {
      setActiveDrag({ kind: 'collaboration', id });
    }
  };

  const handleDropToFollowUps = (item: WorkspaceFollowUpCandidate) => {
    const sourceId = followUpSourceId(item);
    if (trackedSourceIds?.has(sourceId)) {
      toast.message(
        item.kind === 'need'
          ? 'این نیاز قبلاً در پیگیری‌ها ثبت شده'
          : 'این همکاری قبلاً در پیگیری‌ها ثبت شده'
      );
      return;
    }
    onAddToFollowUp?.(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (overId === WORKSPACE_FOLLOWUPS_DROP_ID) {
      if (order.needs.includes(activeId)) {
        const need = needsById.get(activeId);
        if (need) handleDropToFollowUps(need);
        return;
      }
      if (order.collaborations.includes(activeId)) {
        const collab = collabById.get(activeId);
        if (collab) handleDropToFollowUps(collab);
        return;
      }
    }

    if (activeId === overId) return;

    const columnOf = (id: string): ColumnKey | null => {
      if (order.needs.includes(id)) return 'needs';
      if (order.files.includes(id)) return 'files';
      if (order.collaborations.includes(id)) return 'collaborations';
      return null;
    };

    const col = columnOf(activeId);
    const overCol = columnOf(overId);
    if (!col || col !== overCol) return;

    setOrder((prev) => {
      const list = [...prev[col]];
      const oldIndex = list.indexOf(activeId);
      const newIndex = list.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, [col]: arrayMove(list, oldIndex, newIndex) };
    });
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:grid lg:min-h-0 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:overflow-hidden">
        <KanbanColumnSkeleton fillHeight />
        <KanbanColumnSkeleton fillHeight className="hidden lg:block" />
        <KanbanColumnSkeleton fillHeight className="hidden lg:block" />
        <KanbanColumnSkeleton fillHeight className="hidden lg:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:grid lg:min-h-0 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:overflow-hidden">
        <div className={columnShell('needs', activeTab)}>
          <SortableContext items={order.needs} strategy={verticalListSortingStrategy}>
            <NeedsColumn
              items={orderedNeeds}
              error={errors.needs}
              onRetry={onRetry}
              emptyMessage="نیاز مرتبطی یافت نشد"
              onAddToFollowUp={onAddToFollowUp}
              trackedSourceIds={trackedSourceIds}
              fillHeight
            />
          </SortableContext>
        </div>

        <div className={columnShell('files', activeTab)}>
          <SortableContext items={order.files} strategy={verticalListSortingStrategy}>
            <RegionalFilingsColumn
              items={orderedFiles}
              feedMeta={regionalFeed}
              businessCity={businessCity}
              error={errors.files}
              onRetry={onRetry}
              onAreasSaved={onAreasSaved}
              fillHeight
            />
          </SortableContext>
        </div>

        <div className={columnShell('collaborations', activeTab)}>
          <SortableContext items={order.collaborations} strategy={verticalListSortingStrategy}>
            <CollaborationsColumn
              items={orderedCollabs}
              error={errors.collaborations}
              onRetry={onRetry}
              emptyMessage=""
              hasServiceArea={collaborationHasServiceArea}
              onCreate={onCreateCollaboration}
              onAddToFollowUp={onAddToFollowUp}
              trackedSourceIds={trackedSourceIds}
              fillHeight
            />
          </SortableContext>
        </div>

        <div className={columnShell('followups', activeTab)}>
          <FollowUpsDropZone highlight={activeDrag !== null}>
            <FollowUpsColumn
              items={followUps}
              fillHeight
              dropHint={activeDrag !== null}
              onStageChange={onFollowUpStageChange}
              onAppendNote={onFollowUpAppendNote}
              onSetReminder={onFollowUpSetReminder}
              onClearReminder={onFollowUpClearReminder}
              onRemove={onFollowUpRemove}
            />
          </FollowUpsDropZone>
        </div>
      </div>

      <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION}>
        {draggingNeed ? (
          <DragOverlayShell>
            <NeedCard
              item={draggingNeed}
              isInFollowUps={trackedSourceIds?.has(draggingNeed.requestId)}
            />
          </DragOverlayShell>
        ) : null}
        {draggingFile ? (
          <DragOverlayShell>
            <PropertyCard item={draggingFile} />
          </DragOverlayShell>
        ) : null}
        {draggingCollab ? (
          <DragOverlayShell>
            <CollaborationCard item={draggingCollab} />
          </DragOverlayShell>
        ) : null}
      </DragOverlay>
    </DndContext>
    </div>
  );
}
