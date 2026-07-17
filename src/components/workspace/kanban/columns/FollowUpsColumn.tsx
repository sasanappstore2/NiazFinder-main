'use client';

import { ClipboardList } from 'lucide-react';
import { KanbanColumn } from '../KanbanColumn';
import { FollowUpCard } from '../cards/FollowUpCard';
import { FOLLOW_UP_STAGES, type WorkspaceFollowUpItem } from '../../types';
import type { FollowUpQuickReminderPreset } from '@/lib/business/workspace/follow-up-stage-actions';

export function FollowUpsColumn({
  items,
  fillHeight,
  dropHint,
  onStageChange,
  onAppendNote,
  onSetReminder,
  onClearReminder,
  onRemove,
}: {
  items: WorkspaceFollowUpItem[];
  fillHeight?: boolean;
  dropHint?: boolean;
  onStageChange?: (followUpId: string, stage: WorkspaceFollowUpItem['stage']) => void;
  onAppendNote?: (followUpId: string, text: string) => void;
  onSetReminder?: (followUpId: string, preset: FollowUpQuickReminderPreset) => void;
  onClearReminder?: (followUpId: string) => void;
  onRemove?: (followUpId: string) => void;
}) {
  const byStage = FOLLOW_UP_STAGES.map((stage) => ({
    ...stage,
    items: items.filter((item) => item.stage === stage.id),
  }));

  return (
    <KanbanColumn
      title="پیگیری‌ها"
      count={items.length}
      isEmpty={false}
      emptyMessage=""
      fillHeight={fillHeight}
      dropHint={dropHint}
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-8 text-center">
          <ClipboardList className="size-6 text-muted-foreground/50" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            هنوز پیگیری‌ای ثبت نشده — یک نیاز یا همکاری را از ستون‌های کناری اینجا بکشید یا از
            دکمهٔ «افزودن به پیگیری‌ها» روی هر کارت استفاده کنید.
          </p>
        </div>
      ) : (
      <div className="space-y-3">
        {byStage.map((stage) => (
          <div
            key={stage.id}
            className="rounded-lg border border-border/50 bg-background/60 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium">{stage.label}</h3>
              <span className="text-[10px] text-muted-foreground">
                {stage.items.length.toLocaleString('fa-IR')}
              </span>
            </div>

            {stage.items.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                پیگیری‌ای ثبت نشده
              </p>
            ) : (
              <div className="space-y-2">
                {stage.items.map((item) => (
                  <FollowUpCard
                    key={item.id}
                    item={item}
                    onStageChange={
                      onStageChange
                        ? (nextStage) => onStageChange(item.id, nextStage)
                        : undefined
                    }
                    onAppendNote={
                      onAppendNote ? (text) => onAppendNote(item.id, text) : undefined
                    }
                    onSetReminder={
                      onSetReminder ? (preset) => onSetReminder(item.id, preset) : undefined
                    }
                    onClearReminder={
                      onClearReminder ? () => onClearReminder(item.id) : undefined
                    }
                    onRemove={onRemove ? () => onRemove(item.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </KanbanColumn>
  );
}
