'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import { ChatMessageList, type ChatMessageListProps } from '@/components/chat/thread/ChatMessageList';
import { ChatPinnedBar } from '@/components/chat/thread/ChatPinnedBar';

export type ChatThreadProps = Omit<ChatMessageListProps, 'messagesEndRef'> & {
  scrollRootRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  pinnedMessage?: Message | null;
  onUnpinPinned?: () => void;
};

export function ChatThread({
  scrollRootRef,
  messagesEndRef,
  pinnedMessage,
  onUnpinPinned,
  ...listProps
}: ChatThreadProps) {
  return (
    <div ref={scrollRootRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {pinnedMessage && onUnpinPinned && (
        <ChatPinnedBar
          message={pinnedMessage}
          onScrollToMessage={listProps.onScrollToMessage}
          onUnpin={onUnpinPinned}
        />
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div
          className="chat-thread"
          dir="rtl"
          role="log"
          aria-label="پیام‌ها"
          aria-live="polite"
        >
          <ChatMessageList {...listProps} messagesEndRef={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
