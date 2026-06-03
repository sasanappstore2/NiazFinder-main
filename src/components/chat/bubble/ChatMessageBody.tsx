'use client';

import type { Message } from '@/lib/types';
import { MESSAGE_DELETED_TOMBSTONE } from '@/lib/chat/message-delete';
import { ChatMessageContent } from '@/components/chat/ChatMessageContent';
import { ChatMessageReplyQuote } from '@/components/chat/ChatMessageReplyQuote';
import {
  classifyMessageContent,
  messageTextClassName,
} from '@/lib/chat/ui/message-layout';

export interface ChatMessageBodyProps {
  message: Message;
  isOwn: boolean;
  formatTime: (dateStr: string) => string;
  onScrollToMessage?: (messageId: string) => void;
  onImageOpen?: () => void;
}

export function ChatMessageBody({
  message,
  isOwn,
  formatTime,
  onScrollToMessage,
  onImageOpen,
}: ChatMessageBodyProps) {
  const hints = classifyMessageContent(message);

  if (hints.kind === 'deleted') {
    return <p className="chat-message-text">{MESSAGE_DELETED_TOMBSTONE}</p>;
  }

  const isImage = hints.kind === 'image';
  const isVoice = hints.kind === 'voice';

  return (
    <>
      {message.replyTo && (
        <ChatMessageReplyQuote
          replyTo={message.replyTo}
          isOwn={isOwn}
          onScrollToSource={onScrollToMessage}
        />
      )}
      <ChatMessageContent
        message={message}
        isOwn={isOwn}
        textClassName={messageTextClassName(hints)}
        imageMeta={
          isImage
            ? { timeLabel: formatTime(message.createdAt), isRead: Boolean(message.isRead) }
            : undefined
        }
        voiceMeta={
          isVoice
            ? { timeLabel: formatTime(message.createdAt), isRead: Boolean(message.isRead) }
            : undefined
        }
        onImageOpen={isImage ? onImageOpen : undefined}
      />
    </>
  );
}
