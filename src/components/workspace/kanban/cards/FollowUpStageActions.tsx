'use client';

import { useState } from 'react';
import { AlarmClock, Bell, ChevronDown, StickyNote, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { getTimeAgo } from '@/lib/constants';
import {
  FOLLOW_UP_STAGE_ACTIONS,
  formatReminderDue,
  isReminderOverdue,
  type FollowUpQuickReminderPreset,
} from '@/lib/business/workspace/follow-up-stage-actions';
import { cn } from '@/lib/utils';
import { requestFollowUpNotificationPermission } from '../../hooks/useFollowUpReminderScheduler';
import type { FollowUpStageId, WorkspaceFollowUpItem } from '../../types';

export function FollowUpStageActions({
  item,
  onAppendNote,
  onSetReminder,
  onClearReminder,
}: {
  item: WorkspaceFollowUpItem;
  onAppendNote?: (text: string) => void;
  onSetReminder?: (preset: FollowUpQuickReminderPreset) => void;
  onClearReminder?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  const config = FOLLOW_UP_STAGE_ACTIONS[item.stage];
  const stageNotes = (item.stageNotes ?? []).filter((n) => n.stage === item.stage).slice(-3);
  const reminder = item.reminder && !item.reminder.firedAt ? item.reminder : null;
  const overdue = reminder ? isReminderOverdue(reminder.dueAt) : false;

  const handleSaveNote = () => {
    const trimmed = draftNote.trim();
    if (!trimmed || !onAppendNote) return;
    onAppendNote(trimmed);
    setDraftNote('');
    toast.success('یادداشت ثبت شد');
  };

  const handleSetReminder = async (preset: FollowUpQuickReminderPreset) => {
    if (!onSetReminder) return;
    await requestFollowUpNotificationPermission();
    onSetReminder(preset);
    toast.success(`یادآور «${preset.label}» تنظیم شد`);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between px-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1">
            <Bell className="size-3" />
            اقدامات این مرحله
          </span>
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-1">
        <p className="text-[10px] leading-relaxed text-muted-foreground">{config.hint}</p>

        {reminder ? (
          <div
            className={cn(
              'flex items-start justify-between gap-2 rounded-md border px-2 py-1.5',
              overdue
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-primary/30 bg-primary/5'
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10px] font-medium">
                <AlarmClock className="size-3 shrink-0" />
                {reminder.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatReminderDue(reminder.dueAt)}</p>
              {overdue ? (
                <Badge variant="outline" className="mt-1 h-4 text-[9px] text-amber-700">
                  سررسید گذشته
                </Badge>
              ) : null}
            </div>
            {onClearReminder ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={onClearReminder}
                aria-label="لغو یادآور"
              >
                <X className="size-3" />
              </Button>
            ) : null}
          </div>
        ) : null}

        {config.quickReminders.length > 0 && onSetReminder ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">یادآور سریع</p>
            <div className="flex flex-wrap gap-1">
              {config.quickReminders.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => void handleSetReminder(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {onAppendNote ? (
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <StickyNote className="size-3" />
              یادداشت مرحله
            </p>
            <Textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder={config.notePlaceholder}
              rows={2}
              className="min-h-0 resize-none text-[11px]"
            />
            <Button
              type="button"
              size="sm"
              className="h-7 w-full text-[10px]"
              disabled={!draftNote.trim()}
              onClick={handleSaveNote}
            >
              ثبت یادداشت
            </Button>
          </div>
        ) : null}

        {stageNotes.length > 0 ? (
          <div className="space-y-1 border-t border-border/40 pt-2">
            <p className="text-[10px] font-medium text-muted-foreground">یادداشت‌های این مرحله</p>
            {stageNotes.map((note) => (
              <div key={note.id} className="rounded-md bg-muted/40 px-2 py-1.5">
                <p className="text-[10px] leading-relaxed">{note.text}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {getTimeAgo(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Stage label helper for external use */
export function stageActionLabel(stage: FollowUpStageId): string {
  return FOLLOW_UP_STAGE_ACTIONS[stage].hint;
}
