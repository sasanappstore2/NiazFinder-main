'use client';

import { memo } from 'react';
import { Loader2, MessageSquare, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Conversation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTypingListRefresh } from '@/hooks/useTypingListRefresh';

type ChatConversationListProps = {
  enabled: boolean;
  isLoading: boolean;
  searchQuery: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
  getAvatarColor: (name: string) => string;
  getInitials: (name: string) => string;
  formatTimeAgo: (date: string) => string;
};

function ChatConversationListInner({
  enabled,
  isLoading,
  searchQuery,
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartNewChat,
  getAvatarColor,
  getInitials,
  formatTimeAgo,
}: ChatConversationListProps) {
  useTypingListRefresh(enabled);
  const isConversationTyping = useAppStore((s) => s.isConversationTyping);

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
          {!searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onStartNewChat}
            >
              <Plus className="h-4 w-4 ml-1" />
              شروع گفتگوی جدید
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-0.5 p-2">
          {conversations.map((conv) => {
            const convName =
              `${conv.otherUser?.firstName ?? ''} ${conv.otherUser?.lastName ?? ''}`.trim() ||
              'کاربر';
            const isSelected = conv.id === activeConversationId;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg p-3 text-right transition-all duration-150',
                  isSelected
                    ? 'bg-primary/5 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                )}
                role="listitem"
                aria-label={`مکالمه با ${convName}${conv.unreadCount > 0 ? `، ${conv.unreadCount} پیام خوانده نشده` : ''}`}
              >
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white',
                      getAvatarColor(convName)
                    )}
                  >
                    {getInitials(convName)}
                  </div>
                  {conv.otherUser?.online && (
                    <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{convName}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {isConversationTyping(conv.id) ? (
                      <p
                        className="truncate text-sm font-medium text-primary"
                        style={{ maxWidth: '200px' }}
                      >
                        در حال تایپ
                      </p>
                    ) : (
                      <p
                        className="truncate text-sm text-muted-foreground"
                        style={{ maxWidth: '200px' }}
                      >
                        {conv.lastMessage
                          ? conv.lastMessage.length > 40
                            ? conv.lastMessage.slice(0, 40) + '...'
                            : conv.lastMessage
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
          })}
        </div>
      )}
    </ScrollArea>
  );
}

export const ChatConversationList = memo(ChatConversationListInner);
