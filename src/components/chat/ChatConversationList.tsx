'use client';

import { memo } from 'react';
import { Bot, BellOff, Loader2, MessageSquare, Plus, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Conversation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTypingListRefresh } from '@/hooks/useTypingListRefresh';
import { ChatPresenceDot } from '@/components/chat/ChatPresenceDot';
import { sanitizeUserFacingPersianText } from '@/lib/persian-encoding-guard';

type ChatConversationListProps = {
  enabled: boolean;
  isLoading: boolean;
  searchQuery: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
  onSearchPeople?: (query: string) => void;
  getAvatarColor: (name: string) => string;
  getInitials: (name: string) => string;
  formatTimeAgo: (date: string) => string;
};

function conversationName(conv: Conversation): string {
  if (conv.isPlatformBot) return 'دستیار نیازفایندر';
  return (
    `${conv.otherUser?.firstName ?? ''} ${conv.otherUser?.lastName ?? ''}`.trim() ||
    'کاربر'
  );
}

function ConversationRow({
  conv,
  isSelected,
  isConversationTyping,
  onSelectConversation,
  getAvatarColor,
  getInitials,
  formatTimeAgo,
}: {
  conv: Conversation;
  isSelected: boolean;
  isConversationTyping: (id: string) => boolean;
  onSelectConversation: (id: string) => void;
  getAvatarColor: (name: string) => string;
  getInitials: (name: string) => string;
  formatTimeAgo: (date: string) => string;
}) {
  const convName = conversationName(conv);
  const isBot = Boolean(conv.isPlatformBot);

  return (
    <button
      key={conv.id}
      onClick={() => onSelectConversation(conv.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all duration-150',
        isBot
          ? cn(
              'border border-primary/20 bg-primary/5',
              isSelected && 'border-primary/35 bg-primary/10 shadow-sm'
            )
          : isSelected
            ? 'border border-primary/20 bg-primary/5'
            : 'border border-transparent hover:bg-muted/50'
      )}
      role="listitem"
      aria-label={`مکالمه با ${convName}${conv.unreadCount > 0 ? `، ${conv.unreadCount} پیام خوانده نشده` : ''}${conv.isMuted ? '، بی‌صدا' : ''}`}
    >
      <div className="relative shrink-0">
        {isBot ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary ring-2 ring-primary/20">
            <Bot className="size-5" aria-hidden />
          </div>
        ) : (
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white',
              getAvatarColor(convName)
            )}
          >
            {getInitials(convName)}
          </div>
        )}
        {!isBot ? (
          <ChatPresenceDot
            online={conv.otherUser?.online}
            className="absolute bottom-0 left-0 h-3.5 w-3.5"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
            <span className="truncate">{convName}</span>
            {conv.isMuted ? (
              <BellOff className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {isConversationTyping(conv.id) ? (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
              در حال تایپ
            </p>
          ) : (
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {conv.lastMessage
                ? (() => {
                    const preview = sanitizeUserFacingPersianText(conv.lastMessage);
                    return preview.length > 40 ? preview.slice(0, 40) + '...' : preview;
                  })()
                : isBot
                  ? 'دستیار هوشمند نیازفایندر'
                  : 'شروع گفتگو...'}
            </p>
          )}
          {conv.unreadCount > 0 && (
            <Badge className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-xs tabular-nums">
              {conv.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatConversationListInner({
  enabled,
  isLoading,
  searchQuery,
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartNewChat,
  onSearchPeople,
  getAvatarColor,
  getInitials,
  formatTimeAgo,
}: ChatConversationListProps) {
  useTypingListRefresh(enabled);
  const isConversationTyping = useAppStore((s) => s.isConversationTyping);

  const platformBot = conversations.find((c) => c.isPlatformBot);
  const regularConversations = conversations.filter((c) => !c.isPlatformBot);

  return (
    <ScrollArea className="min-h-0 flex-1" role="list" aria-label="مکالمات">
      {isLoading && conversations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'مکالمه‌ای یافت نشد' : 'هنوز مکالمه‌ای ندارید'}
          </p>
          {searchQuery && onSearchPeople ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onSearchPeople(searchQuery)}
            >
              <Search className="h-4 w-4 ms-1" />
              جستجوی «{searchQuery}» بین افراد
            </Button>
          ) : !searchQuery ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onStartNewChat}
            >
              <Plus className="h-4 w-4 ml-1" />
              شروع گفتگوی جدید
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-0.5 p-2">
          {platformBot ? (
            <ConversationRow
              conv={platformBot}
              isSelected={platformBot.id === activeConversationId}
              isConversationTyping={isConversationTyping}
              onSelectConversation={onSelectConversation}
              getAvatarColor={getAvatarColor}
              getInitials={getInitials}
              formatTimeAgo={formatTimeAgo}
            />
          ) : null}
          {regularConversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              isSelected={conv.id === activeConversationId}
              isConversationTyping={isConversationTyping}
              onSelectConversation={onSelectConversation}
              getAvatarColor={getAvatarColor}
              getInitials={getInitials}
              formatTimeAgo={formatTimeAgo}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

export const ChatConversationList = memo(ChatConversationListInner);
