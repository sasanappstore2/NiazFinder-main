'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessageList, type ChatMessageListProps } from '@/components/chat/thread/ChatMessageList';

export type ChatThreadProps = Omit<ChatMessageListProps, 'messagesEndRef'> & {
  scrollRootRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

export function ChatThread({ scrollRootRef, messagesEndRef, ...listProps }: ChatThreadProps) {
  return (
    <div ref={scrollRootRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
