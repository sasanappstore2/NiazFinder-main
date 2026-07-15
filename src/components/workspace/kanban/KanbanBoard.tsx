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
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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

const LG_MEDIA = '(min-width: 1024px)';
const KANBAN_PANEL_STORAGE_ID = 'workspace-kanban-columns-v2';

const DRAG_OVERLAY_DROP_ANIMATION: DropAnimation = {
  ...defaultDropAnimation,
  duration: 220,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
};

function subscribeLg(onStoreChange: () => void) {
  const mql = window.matchMedia(LG_MEDIA);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

function getLgSnapshot() {
  return window.matchMedia(LG_MEDIA).matches;
}

function useIsLgViewport() {
  return useSyncExternalStore(subscribeLg, getLgSnapshot, () => false);
}

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
    activeTab !== tab ? 'hidden' : 'flex min-h-0 flex-1 flex-col',
    className
  );
}

function collisionDetection(args: Parameters<typeof closestCenter>[0]) {
  const pointerHits = pointerWithin(args);
  const followUpHit = pointerHits.find((c) => c.id === WORKSPACE_FOLLOWUPS_DROP_ID);
  if (followUpHit) return [followUpHit];
  return closestCenter(args);
}

function KanbanPanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div dir="rtl" className={cn('flex h-full min-h-0 min-w-0 flex-col text-start', className)}>
      {children}
    </div>
  );
}

function KanbanResizeHandle() {
  return (
    <ResizableHandle
      withHandle
      className="mx-0 w-2 shrink-0 bg-transparent after:w-1 hover:bg-primary/10 data-[resize-handle-active]:bg-primary/15"
      title="تغییر عرض ستون"
    />
  );
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
  const isLg = useIsLgViewport();
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

  const needsColumn = (
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
  );

  const filesColumn = (
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
  );

  const collaborationsColumn = (
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
  );

  const followUpsColumn = (
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
  );

  if (loading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden',
            isLg && 'min-h-[min(72vh,760px)] lg:flex-row lg:gap-1'
          )}
        >
          <KanbanColumnSkeleton fillHeight />
          {isLg ? (
            <>
              <KanbanColumnSkeleton fillHeight />
              <KanbanColumnSkeleton fillHeight />
              <KanbanColumnSkeleton fillHeight />
            </>
          ) : null}
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
        {isLg ? (
          <div className="min-h-[min(72vh,760px)] flex-1 overflow-hidden">
            <ResizablePanelGroup
              autoSaveId={KANBAN_PANEL_STORAGE_ID}
              direction="horizontal"
              className="h-full min-h-[inherit] rounded-xl"
              dir="ltr"
            >
              {/* DOM left→right; visually RTL: پیگیری … نیازها (rightmost) */}
              <ResizablePanel defaultSize={26} minSize={14} maxSize={48} className="min-w-0">
                <KanbanPanelShell className="pe-1">{followUpsColumn}</KanbanPanelShell>
              </ResizablePanel>
              <KanbanResizeHandle />
              <ResizablePanel defaultSize={24} minSize={14} maxSize={48} className="min-w-0">
                <KanbanPanelShell className="px-0.5">{collaborationsColumn}</KanbanPanelShell>
              </ResizablePanel>
              <KanbanResizeHandle />
              <ResizablePanel defaultSize={26} minSize={16} maxSize={52} className="min-w-0">
                <KanbanPanelShell className="px-0.5">{filesColumn}</KanbanPanelShell>
              </ResizablePanel>
              <KanbanResizeHandle />
              <ResizablePanel defaultSize={24} minSize={14} maxSize={48} className="min-w-0">
                <KanbanPanelShell className="ps-1">{needsColumn}</KanbanPanelShell>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className={columnShell('needs', activeTab)}>{needsColumn}</div>
            <div className={columnShell('files', activeTab)}>{filesColumn}</div>
            <div className={columnShell('collaborations', activeTab)}>{collaborationsColumn}</div>
            <div className={columnShell('followups', activeTab)}>{followUpsColumn}</div>
          </div>
        )}

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
