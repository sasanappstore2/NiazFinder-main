'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { formatReplySenderLabel } from '@/lib/chat/reply-quote';

interface ChatMessageReplyQuoteProps {
  replyTo: NonNullable<Message['replyTo']>;
  isOwn: boolean;
  onScrollToSource?: (messageId: string) => void;
}

export function ChatMessageReplyQuote({
  replyTo,
  isOwn,
  onScrollToSource,
}: ChatMessageReplyQuoteProps) {
  const senderLabel = formatReplySenderLabel(replyTo);

  return (
    <button
      type="button"
      onClick={() => onScrollToSource?.(replyTo.id)}
      className={cn(
        'chat-quote',
        isOwn ? 'chat-quote--sent' : 'chat-quote--received'
      )}
    >
      <p className="font-semibold leading-tight">{senderLabel}</p>
      <p className="chat-message-text mt-0.5 line-clamp-2 text-[0.8125rem] opacity-80">
        {replyTo.content}
      </p>
    </button>
  );
}
