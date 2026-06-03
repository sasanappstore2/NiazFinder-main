'use client';

import { PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import type { Message } from '@/lib/types';
import {
  formatCallLogLabel,
  parseCallLogSnapshot,
} from '@/lib/voice/call-log-labels';
import { cn } from '@/lib/utils';

export function ChatCallLogRow({
  message,
  currentUserId,
  formatTime,
}: {
  message: Message;
  currentUserId?: string;
  formatTime: (dateStr: string) => string;
}) {
  const snapshot = parseCallLogSnapshot(message.content);
  if (!snapshot || !currentUserId) return null;

  const isOutgoing = snapshot.callerId === currentUserId;
  const label = formatCallLogLabel(snapshot.status, isOutgoing, snapshot.durationSec);
  const isMissed = snapshot.status === 'MISSED' || snapshot.status === 'REJECTED';
  const Icon =
    snapshot.status === 'MISSED' || snapshot.status === 'REJECTED'
      ? PhoneMissed
      : isOutgoing
        ? PhoneOutgoing
        : PhoneIncoming;

  return (
    <div className="chat-call-log-row" role="listitem">
      <div
        className={cn(
          'mx-auto flex max-w-sm items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs',
          isMissed
            ? 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400'
            : 'border-border/60 bg-muted/40 text-muted-foreground'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground/70">·</span>
        <span className="text-muted-foreground/80">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
