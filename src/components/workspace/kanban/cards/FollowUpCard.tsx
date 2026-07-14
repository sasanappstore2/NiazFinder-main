'use client';

import { AlarmClock, Calendar, MapPin, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTimeAgo } from '@/lib/constants';
import {
  formatReminderDue,
  isReminderOverdue,
  type FollowUpQuickReminderPreset,
} from '@/lib/business/workspace/follow-up-stage-actions';
import { cn } from '@/lib/utils';
import { FOLLOW_UP_STAGES, type FollowUpStageId, type WorkspaceFollowUpItem } from '../../types';
import { FollowUpStageActions } from './FollowUpStageActions';
import { FollowUpCardContactRow } from './FollowUpCardContactRow';

const STAGE_BADGE_CLASS: Record<FollowUpStageId, string> = {
  new: 'border-primary/30 bg-primary/5 text-primary',
  contacted: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  visited: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  negotiating: 'border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300',
  closed: 'border-border bg-muted text-muted-foreground',
};

export function FollowUpCard({
  item,
  onStageChange,
  onAppendNote,
  onSetReminder,
  onClearReminder,
  onRemove,
}: {
  item: WorkspaceFollowUpItem;
  onStageChange?: (stage: FollowUpStageId) => void;
  onAppendNote?: (text: string) => void;
  onSetReminder?: (preset: FollowUpQuickReminderPreset) => void;
  onClearReminder?: () => void;
  onRemove?: () => void;
}) {
  const stageMeta = FOLLOW_UP_STAGES.find((s) => s.id === item.stage);
  const reminder = item.reminder && !item.reminder.firedAt ? item.reminder : null;
  const overdue = reminder ? isReminderOverdue(reminder.dueAt) : false;

  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 shadow-none">
      <div className="space-y-2 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug">
            {item.subject}
          </p>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[9px] font-normal', STAGE_BADGE_CLASS[item.stage])}
          >
            {stageMeta?.label ?? item.status}
          </Badge>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground"
              aria-label="حذف از پیگیری‌ها"
              onClick={onRemove}
            >
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </div>

        {item.note ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-foreground">{item.note}</p>
        ) : null}

        {reminder ? (
          <p
            className={cn(
              'flex items-center gap-1 text-[10px]',
              overdue ? 'text-amber-700 dark:text-amber-400' : 'text-primary'
            )}
          >
            <AlarmClock className="size-3 shrink-0" />
            <span className="truncate">
              {reminder.label} — {formatReminderDue(reminder.dueAt)}
            </span>
          </p>
        ) : null}

        {item.property ? (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{item.property}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {item.customer ? <span className="truncate">{item.customer}</span> : null}
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Calendar className="size-3" />
            {getTimeAgo(item.createdAt)}
          </span>
        </div>

        <FollowUpStageActions
          item={item}
          onAppendNote={onAppendNote}
          onSetReminder={onSetReminder}
          onClearReminder={onClearReminder}
        />

        {onStageChange ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">مرحله پیگیری</p>
            <Select value={item.stage} onValueChange={(v) => onStageChange(v as FollowUpStageId)}>
              <SelectTrigger className="h-8 w-full text-[11px]">
                <SelectValue placeholder="انتخاب مرحله" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id} className="text-xs">
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/40 px-2.5 py-2">
        <FollowUpCardContactRow item={item} />
      </div>
    </Card>
  );
}
