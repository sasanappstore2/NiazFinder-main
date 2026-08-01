'use client';

import { useState } from 'react';
import { Maximize2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from '../KanbanColumn';
import { PropertyCard } from '../cards/PropertyCard';
import { SortableCardShell } from '../SortableCardShell';
import { WorkspaceServiceAreaDialog } from '../../WorkspaceServiceAreaDialog';
import { WorkspaceFilingsExplorer } from '../../filings/WorkspaceFilingsExplorer';
import { regionalFilingsEmptyMessage } from '@/lib/business/workspace/regional-filings';
import type { WorkspaceFileItem, WorkspaceRegionalFeedMeta } from '../../types';

export function RegionalFilingsColumn({
  items,
  feedMeta,
  businessCity,
  error,
  onRetry,
  filteredEmptyMessage,
  onAreasSaved,
  fillHeight,
}: {
  items: WorkspaceFileItem[];
  feedMeta: WorkspaceRegionalFeedMeta;
  businessCity?: string;
  error?: string;
  onRetry?: () => void;
  filteredEmptyMessage?: string;
  onAreasSaved?: () => void;
  fillHeight?: boolean;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);

  const emptyMessage =
    filteredEmptyMessage ??
    regionalFilingsEmptyMessage(feedMeta.feedStatus, feedMeta.regionLabel);

  return (
    <>
      <KanbanColumn
        title="فایل‌های منطقه"
        count={items.length}
        isEmpty={items.length === 0}
        emptyMessage={emptyMessage}
        error={error}
        onRetry={onRetry}
        fillHeight={fillHeight}
        subtitle={
          feedMeta.filingPreferencesSummary
            ? `فیلتر: ${feedMeta.filingPreferencesSummary}`
            : undefined
        }
        headerAction={
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="باز کردن فایلینگ تمام‌صفحه"
              title="فایلینگ حرفه‌ای"
              onClick={() => setExplorerOpen(true)}
            >
              <Maximize2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="ویرایش مناطق"
              title={feedMeta.regionLabel ?? 'تنظیم مناطق فعالیت'}
              onClick={() => setEditorOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        }
      >
        {items.map((item) => (
          <SortableCardShell key={item.id} id={item.id}>
            {(dragHandle) => <PropertyCard item={item} dragHandle={dragHandle} />}
          </SortableCardShell>
        ))}
      </KanbanColumn>

      <WorkspaceServiceAreaDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        businessCity={businessCity}
        onSaved={onAreasSaved}
      />

      <WorkspaceFilingsExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        items={items}
        feedMeta={feedMeta}
        businessCity={businessCity}
        onEditAreas={() => {
          setExplorerOpen(false);
          setEditorOpen(true);
        }}
      />
    </>
  );
}
