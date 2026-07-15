'use client';

import { ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import { ChatMessageList, type ChatMessageListProps } from '@/components/chat/thread/ChatMessageList';
import { ChatPinnedBar } from '@/components/chat/thread/ChatPinnedBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatThreadProps = Omit<ChatMessageListProps, 'messagesEndRef'> & {
  scrollRootRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  pinnedMessages?: Message[];
  onUnpinPinned?: (messageId: string) => void;
  showScrollToBottom?: boolean;
  onScrollToBottom?: () => void;
  highlightedMessageId?: string | null;
};

export function ChatThread({
  scrollRootRef,
  messagesEndRef,
  pinnedMessages = [],
  onUnpinPinned,
  showScrollToBottom = false,
  onScrollToBottom,
  highlightedMessageId,
  ...listProps
}: ChatThreadProps) {
  return (
    <div ref={scrollRootRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {pinnedMessages.length > 0 ? (
        <ChatPinnedBar
          messages={pinnedMessages}
          onScrollToMessage={listProps.onScrollToMessage}
          onUnpin={onUnpinPinned}
        />
      ) : null}
      <div className="relative min-h-0 flex-1">
        <ScrollArea className="h-full min-h-0">
          <div
            className="chat-thread"
            dir="rtl"
            role="log"
            aria-label="پیام‌ها"
            aria-live="polite"
          >
            <ChatMessageList
              {...listProps}
              messagesEndRef={messagesEndRef}
              highlightedMessageId={highlightedMessageId}
            />
          </div>
        </ScrollArea>
        {showScrollToBottom ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              'absolute bottom-3 end-3 z-10 size-10 rounded-full border border-border/60 bg-background shadow-md',
              'hover:bg-muted'
            )}
            aria-label="رفتن به آخرین پیام"
            onClick={onScrollToBottom}
          >
            <ChevronDown className="size-5 text-emerald-600" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
