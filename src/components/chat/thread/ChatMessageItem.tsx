'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import type { MessageGroupPosition } from '@/lib/chat/message-thread-layout';
import { classifyMessageContent } from '@/lib/chat/ui/message-layout';
import { ChatBubbleShell } from '@/components/chat/bubble/ChatBubbleShell';
import { ChatMessageBody } from '@/components/chat/bubble/ChatMessageBody';
import { ChatReadReceiptIcon } from '@/components/chat/bubble/ChatReadReceiptIcon';
import { ChatMessageReactions } from '@/components/chat/ChatMessageReactions';
import { MessageContextMenu } from '@/components/chat/actions/MessageContextMenu';
import { MessageActionSheet } from '@/components/chat/actions/MessageActionSheet';
import { useMessageGestures } from '@/components/chat/actions/useMessageGestures';
import { useIsMobile } from '@/hooks/use-mobile';
import { canEditChatMessage } from '@/lib/chat/message-edit';

export type PeerDisplay = {
  name: string;
  avatarUrl?: string | null;
  initials: string;
  avatarClassName: string;
};

export interface ChatMessageItemProps {
  msg: Message;
  isMe: boolean;
  group: MessageGroupPosition;
  formatTime: (dateStr: string) => string;
  currentUserId?: string;
  canDeleteForEveryone: boolean;
  peer?: PeerDisplay;
  showPeerAvatar?: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onPin?: () => void;
  onToggleStar?: () => void;
  onForward?: () => void;
  onCopy?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  onImageOpen?: () => void;
  highlighted?: boolean;
}

export function ChatMessageItem({
  msg,
  isMe,
  group,
  formatTime,
  currentUserId,
  canDeleteForEveryone,
  peer,
  showPeerAvatar = false,
  onReply,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onPin,
  onToggleStar,
  onForward,
  onCopy,
  onScrollToMessage,
  onImageOpen,
  highlighted = false,
}: ChatMessageItemProps) {
  const hints = classifyMessageContent(msg);
  const isDeleted = hints.kind === 'deleted';
  const side = isMe ? 'sent' : 'received';
  const showAvatar = !isMe && showPeerAvatar && Boolean(peer);
  const showInlineFooter = !hints.isMedia && !isDeleted;
  const timeLabel = formatTime(msg.createdAt);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const touchGesturesEnabled = isMobile && !isDeleted;
  const canEdit = Boolean(onEdit && canEditChatMessage(msg, currentUserId));

  const { dragX, replyIconOpacity, handleDragEnd, dragProps, touchProps } =
    useMessageGestures({
      disabled: isDeleted,
      onReply,
      touchActionsEnabled: touchGesturesEnabled,
      onLongPress: touchGesturesEnabled ? () => setMenuOpen(true) : undefined,
      onDoubleTap: touchGesturesEnabled ? () => onReact('👍') : undefined,
    });

  const bubbleRow = (
    <div
      className={cn(
        'chat-bubble-row',
        isMe ? 'chat-bubble-row--sent' : 'chat-bubble-row--received'
      )}
    >
      {isMe && !isDeleted && !isMobile && (
        <div className="chat-row-actions chat-row-actions--sent">
              <MessageContextMenu
                isMe={isMe}
                canEdit={canEdit}
                canDeleteForEveryone={canDeleteForEveryone}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDeleteForMe={onDeleteForMe}
                onDeleteForEveryone={onDeleteForEveryone}
                isPinned={Boolean(msg.isPinned)}
                onPin={onPin}
                isStarred={Boolean(msg.isStarred)}
                onToggleStar={onToggleStar}
                onForward={onForward}
                onCopy={onCopy}
              />
            </div>
          )}

          <div className="chat-bubble-main">
        <div className="chat-bubble-wrap">
          <motion.div
            className="chat-gesture-surface"
            style={{ x: dragX, touchAction: touchGesturesEnabled ? 'pan-y' : undefined }}
            onDragEnd={handleDragEnd}
            {...dragProps}
            {...touchProps}
          >
            {touchGesturesEnabled && (
              <MessageActionSheet
                open={menuOpen}
                onOpenChange={setMenuOpen}
                canEdit={canEdit}
                canDeleteForEveryone={canDeleteForEveryone}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDeleteForMe={onDeleteForMe}
                onDeleteForEveryone={onDeleteForEveryone}
                isPinned={Boolean(msg.isPinned)}
                onPin={onPin}
                isStarred={Boolean(msg.isStarred)}
                onToggleStar={onToggleStar}
                onForward={onForward}
                onCopy={onCopy}
              />
            )}
            {!isDeleted && (
              <motion.div
                style={{ opacity: replyIconOpacity }}
                className="chat-reply-hint"
                aria-hidden
              >
                <Reply className="h-5 w-5" />
              </motion.div>
            )}

            <div>
              <ChatBubbleShell
                side={side}
                group={group}
                hints={hints}
                hasFooter={showInlineFooter}
              >
                <div className="chat-bubble-body">
                  <ChatMessageBody
                    message={msg}
                    isOwn={isMe}
                    formatTime={formatTime}
                    onScrollToMessage={onScrollToMessage}
                    onImageOpen={onImageOpen}
                  />
                </div>
                {showInlineFooter && (
                  <div className="chat-bubble-footer" aria-hidden>
                    <span className="chat-bubble-time">{timeLabel}</span>
                    {isMe && (
                      <ChatReadReceiptIcon
                        isRead={msg.isRead}
                        className="chat-meta-read h-3 w-3 shrink-0"
                      />
                    )}
                  </div>
                )}
              </ChatBubbleShell>
            </div>
          </motion.div>
        </div>

        {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
          <div className="chat-message-reactions-wrap">
            <ChatMessageReactions
              reactions={msg.reactions}
              currentUserId={currentUserId}
              onReact={onReact}
              pillClassName="chat-reaction-pill"
            />
          </div>
        )}
      </div>

      {!isMe && !isDeleted && !isMobile && (
        <div className="chat-row-actions chat-row-actions--received">
              <MessageContextMenu
                isMe={isMe}
                canEdit={canEdit}
                canDeleteForEveryone={canDeleteForEveryone}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDeleteForMe={onDeleteForMe}
                onDeleteForEveryone={onDeleteForEveryone}
                isPinned={Boolean(msg.isPinned)}
                onPin={onPin}
                isStarred={Boolean(msg.isStarred)}
                onToggleStar={onToggleStar}
                onForward={onForward}
                onCopy={onCopy}
              />
            </div>
          )}
    </div>
  );

  if (isMe) {
    return (
      <div
        data-message-id={msg.id}
        className={cn(
          'chat-message chat-message--outgoing',
          !group.isFirst && 'chat-message--stacked',
          highlighted && 'chat-message--highlighted'
        )}
      >
        <div className="chat-message-column">{bubbleRow}</div>
      </div>
    );
  }

  return (
    <div
      data-message-id={msg.id}
      className={cn(
        'chat-message chat-message--incoming',
        !showAvatar && 'chat-message--stacked',
        highlighted && 'chat-message--highlighted'
      )}
    >
      <div className="chat-message-align-row">
        {showAvatar && peer ? (
          <div className={cn('chat-message-avatar', peer.avatarClassName)} aria-hidden>
            {peer.avatarUrl ? <img src={peer.avatarUrl} alt="" /> : peer.initials}
          </div>
        ) : (
          !isMe && <div className="chat-message-avatar-spacer" aria-hidden />
        )}

        <div className="chat-message-column">
          {bubbleRow}
        </div>
      </div>
    </div>
  );
}
