'use client';

import { Loader2, MessageSquare } from 'lucide-react';
import type { Message } from '@/lib/types';
import {
  getMessageGroupPosition,
  shouldShowPeerAvatar,
} from '@/lib/chat/message-thread-layout';
import { getMessageClusterMeta } from '@/lib/chat/ui/message-grouping';
import { cn } from '@/lib/utils';
import { ChatMessageItem, type PeerDisplay } from '@/components/chat/thread/ChatMessageItem';
import { ChatCallLogRow } from '@/components/chat/thread/ChatCallLogRow';
import { ChatPeerTyping } from '@/components/chat/ChatPeerTyping';

export interface ChatMessageListProps {
  messages: Message[];
  currentUserId?: string;
  isLoading: boolean;
  formatTime: (dateStr: string) => string;
  canDeleteForEveryone: (
    senderId: string,
    requesterId: string,
    createdAt: Date
  ) => boolean;
  onReply: (msg: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit?: (msg: Message) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryoneRequest: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onImageOpen: (messageId: string) => void;
  peerTyping: {
    isTyping: boolean;
    displayName?: string;
  };
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  peer?: PeerDisplay;
  needBanner?: React.ReactNode;
}

export function ChatMessageList({
  messages,
  currentUserId,
  isLoading,
  formatTime,
  canDeleteForEveryone,
  onReply,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryoneRequest,
  onPin,
  onScrollToMessage,
  onImageOpen,
  peerTyping,
  messagesEndRef,
  peer,
  needBanner,
}: ChatMessageListProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">هنوز پیامی ارسال نشده</p>
        <p className="mt-1 text-xs text-muted-foreground/60">اولین پیام خود را ارسال کنید!</p>
      </div>
    );
  }

  return (
    <>
      <p className="chat-thread-start">مکالمه آغاز شد</p>

      {needBanner}

      {messages.map((msg, index) => {
        if (msg.type === 'CALL') {
          const cluster = getMessageClusterMeta(messages, index);
          return (
            <div key={msg.id} className="chat-message-slot chat-message-slot--call-log">
              {cluster.showDateSeparator && cluster.dateLabel && (
                <div className="chat-date-separator">{cluster.dateLabel}</div>
              )}
              <ChatCallLogRow
                message={msg}
                currentUserId={currentUserId}
                formatTime={formatTime}
              />
            </div>
          );
        }

        const isMe = msg.senderId === currentUserId;
        const group = getMessageGroupPosition(messages, index);
        const cluster = getMessageClusterMeta(messages, index);
        const showDeleteForEveryone =
          isMe &&
          Boolean(currentUserId) &&
          canDeleteForEveryone(msg.senderId, currentUserId!, new Date(msg.createdAt));

        const prev = index > 0 ? messages[index - 1] : null;
        const groupBreak = Boolean(prev && prev.senderId !== msg.senderId);
        const showPeerAvatar = shouldShowPeerAvatar(messages, index, currentUserId);

        return (
          <div
            key={msg.id}
            className={cn(
              'chat-message-slot',
              isMe ? 'chat-message-slot--outgoing' : 'chat-message-slot--incoming',
              groupBreak && 'chat-message-slot--group-break'
            )}
          >
            {cluster.showDateSeparator && cluster.dateLabel && (
              <div className="chat-date-separator">{cluster.dateLabel}</div>
            )}
            <ChatMessageItem
              msg={msg}
              isMe={isMe}
              group={group}
              formatTime={formatTime}
              currentUserId={currentUserId}
              canDeleteForEveryone={showDeleteForEveryone}
              onReply={() => onReply(msg)}
              onReact={(emoji) => onReact(msg.id, emoji)}
              onEdit={onEdit ? () => onEdit(msg) : undefined}
              onDeleteForMe={() => onDeleteForMe(msg.id)}
              onDeleteForEveryone={() => onDeleteForEveryoneRequest(msg.id)}
              onPin={() => onPin(msg.id)}
              onScrollToMessage={onScrollToMessage}
              onImageOpen={() => onImageOpen(msg.id)}
              peer={!isMe ? peer : undefined}
              showPeerAvatar={showPeerAvatar}
            />
          </div>
        );
      })}

      <ChatPeerTyping
        visible={peerTyping.isTyping}
        peerName={peerTyping.displayName}
        variant="bubble"
      />

      <div ref={messagesEndRef} />
    </>
  );
}
