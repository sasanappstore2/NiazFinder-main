'use client';

import { ChatReadReceiptIcon } from '@/components/chat/bubble/ChatReadReceiptIcon';

export function ChatBubbleMeta({
  timeLabel,
  isOwn,
  isRead,
  showTicks = true,
}: {
  timeLabel: string;
  isOwn: boolean;
  isRead?: boolean;
  showTicks?: boolean;
}) {
  return (
    <div className="chat-bubble-meta">
      <span className="tabular-nums">{timeLabel}</span>
      {isOwn && showTicks && (
        <ChatReadReceiptIcon
          isRead={isRead}
          className="chat-meta-read h-3.5 w-3.5 shrink-0"
        />
      )}
    </div>
  );
}
