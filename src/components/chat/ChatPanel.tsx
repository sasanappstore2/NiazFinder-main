'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  SendHorizontal,
  Paperclip,
  ArrowRight,
  Plus,
  MessageCircle,
  CheckCheck,
  Reply,
  Smile,
  X,
  BadgeCheck,
  Loader2,
  Users,
  Phone,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
};

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الان';
    if (mins < 60) return `${mins} دقیقه پیش`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ساعت پیش`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} روز پیش`;
    return d.toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
};

// ─── User search result type ──────────────────────────────────────────────────

interface SearchedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  isVerified?: boolean;
  online?: boolean;
  city?: string;
  bio?: string;
  role?: string;
}

const QUICK_EMOJIS = [
  '❤️', '😊', '👍', '😂', '🎉', '😮',
  '😢', '😡', '👏', '🙏', '💪', '✨',
  '🎯', '💯', '🔥', '⭐', '🌟', '👌',
  '🤝', '📌', '🔔', '✅', '❌', '💯',
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatPanel() {
  const {
    isAuthenticated,
    setAuthModalOpen,
    currentUser,
    conversations,
    messages,
    activeConversationId,
    isLoading,
    authToken,
    fetchConversations,
    fetchConversationMessages,
    sendMessage,
    setActiveConversationId,
    addOrUpdateConversation,
  } = useAppStore();

  // ── Local state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<{ messageId: string; senderName: string; content: string } | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── New Chat / User Search state ────────────────────────────────────────
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived state ───────────────────────────────────────────────────────
  const selectedConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const otherUser = selectedConversation?.otherUser;

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const name = `${c.otherUser?.firstName ?? ''} ${c.otherUser?.lastName ?? ''}`.trim();
        return name.includes(searchQuery) || (c.lastMessage?.includes(searchQuery) ?? false);
      })
    : conversations;

  // ── Fetch conversations on mount ───────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchConversations();
    }
  }, [isAuthenticated, authToken, fetchConversations]);

  // ── Fetch messages when conversation changes ───────────────────────────
  useEffect(() => {
    if (activeConversationId && authToken) {
      fetchConversationMessages(activeConversationId);
      setShowMessages(true);
    }
  }, [activeConversationId, authToken, fetchConversationMessages]);

  // ── Scroll to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // ── Debounced user search ──────────────────────────────────────────────
  useEffect(() => {
    if (!showNewChat) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = userSearchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = authToken;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`,
          { headers }
        );

        if (!res.ok) {
          setSearchResults([]);
          return;
        }

        const data = await res.json();
        const users: SearchedUser[] = (data.data ?? data.users ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: u.displayName,
          username: u.username,
          avatar: u.avatar,
          isVerified: u.isVerified,
          online: u.online,
          city: u.city,
          bio: u.bio,
          role: u.role,
        }));
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [userSearchQuery, showNewChat, authToken]);

  // ── Focus user search input when toggling ──────────────────────────────
  useEffect(() => {
    if (showNewChat) {
      requestAnimationFrame(() => {
        userSearchInputRef.current?.focus();
      });
    }
  }, [showNewChat]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Select conversation ────────────────────────────────────────────────
  const handleSelectConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    setShowMessages(true);
    setReplyTo(null);
    inputRef.current?.focus();
  }, [setActiveConversationId]);

  // ── Create / select conversation from search result ─────────────────────
  const handleSelectSearchUser = useCallback(
    async (user: SearchedUser) => {
      if (isCreatingConversation) return;
      setIsCreatingConversation(true);

      try {
        const token = authToken;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ otherUserId: user.id }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'خطا در ایجاد گفتگو');
        }

        const data = await res.json();
        const conversation = data.conversation ?? data;

        // Add to store
        addOrUpdateConversation({
          id: conversation.id,
          requestId: conversation.requestId,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt ? String(conversation.lastMessageAt) : undefined,
          unreadCount: conversation.unreadCount ?? 0,
          otherUser: {
            id: user.id,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            avatar: user.avatar ?? null,
            online: user.online ?? false,
          },
        });

        // Select it
        handleSelectConversation(conversation.id);
        setShowNewChat(false);
        setUserSearchQuery('');
        setSearchResults([]);
      } catch (err: any) {
        console.error('Error creating conversation:', err);
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [authToken, isCreatingConversation, addOrUpdateConversation, handleSelectConversation]
  );

  // ── Toggle new chat panel ───────────────────────────────────────────────
  const handleToggleNewChat = useCallback(() => {
    setShowNewChat((prev) => !prev);
    if (showNewChat) {
      setUserSearchQuery('');
      setSearchResults([]);
    }
  }, [showNewChat]);

  // ── Back to conversation list ──────────────────────────────────────────
  const handleBack = useCallback(() => {
    setShowMessages(false);
    setActiveConversationId(null);
    setReplyTo(null);
  }, [setActiveConversationId]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeConversationId || isSendingMessage) return;

    setIsSendingMessage(true);
    setNewMessage('');
    setReplyTo(null);

    const success = await sendMessage(activeConversationId, newMessage.trim());
    if (!success) {
      // Restore the message if send failed
      setNewMessage(newMessage.trim());
    }

    setIsSendingMessage(false);
    inputRef.current?.focus();
  }, [newMessage, activeConversationId, isSendingMessage, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Emoji helper ─────────────────────────────────────────────────────────
  const insertEmoji = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const updated = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(updated);
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  }, [newMessage]);

  // ─── Reply helper ────────────────────────────────────────────────────────
  const startReply = useCallback((msg: any) => {
    const isMe = msg.senderId === currentUser?.id;
    setReplyTo({
      messageId: msg.id,
      senderName: isMe ? 'شما' : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}`.trim() : 'ناشناس'),
      content: msg.content,
    });
    inputRef.current?.focus();
  }, [currentUser?.id, otherUser]);

  // ─── Auth Guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">دسترسی به پیام‌ها</h3>
            <p className="text-sm text-muted-foreground">
              برای مشاهده و ارسال پیام، ابتدا وارد حساب کاربری شوید
            </p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} className="mt-2">
            ورود / ثبت‌نام
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* ── Conversation List ── */}
      <div
        className={cn(
          'flex w-full min-h-0 flex-col overflow-hidden border-l md:w-[380px] md:border-l',
          showMessages ? 'hidden md:flex' : 'flex'
        )}
        role="navigation"
        aria-label="لیست مکالمات"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-bold">پیام‌ها</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9',
                showNewChat && 'text-primary bg-primary/10 hover:bg-primary/15'
              )}
              aria-label={showNewChat ? 'بازگشت به مکالمات' : 'مکالمه جدید'}
              title={showNewChat ? 'بازگشت به لیست مکالمات' : 'جستجوی کاربر و مکالمه جدید'}
              onClick={handleToggleNewChat}
            >
              {showNewChat ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {showNewChat ? (
              <Input
                ref={userSearchInputRef}
                placeholder="جستجوی کاربر (نام، آیدی، شماره...)"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="h-10 pr-9 text-sm"
                aria-label="جستجوی کاربر"
              />
            ) : (
              <Input
                placeholder="جستجوی مکالمه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-9 text-sm"
                aria-label="جستجوی مکالمه"
              />
            )}
          </div>
        </div>

        {/* Content area */}
        {showNewChat ? (
          /* ── User Search Results ── */
          <ScrollArea className="min-h-0 flex-1" role="list" aria-label="نتایج جستجوی کاربر">
            <div className="space-y-0.5 p-2">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="mr-2 text-sm text-muted-foreground">در حال جستجو...</span>
                </div>
              )}

              {!isSearching && userSearchQuery.trim() === '' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">نام، آیدی یا شماره کاربر را جستجو کنید</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    مثال: @sasan_rashidi یا ساسان رشیدی
                  </p>
                </div>
              )}

              {!isSearching && userSearchQuery.trim() !== '' && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">کاربری یافت نشد</p>
                </div>
              )}

              {!isSearching &&
                searchResults.map((user) => {
                  const name =
                    (user.displayName ??
                    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()) ||
                    'کاربر';
                  const avatarColor = getAvatarColor(name);
                  const initials = getInitials(name);

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectSearchUser(user)}
                      disabled={isCreatingConversation}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg p-3 text-right transition-all duration-150',
                        'hover:bg-muted/50 border border-transparent',
                        'disabled:opacity-60 disabled:cursor-wait'
                      )}
                      role="listitem"
                      aria-label={`شروع مکالمه با ${name}`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white',
                            avatarColor
                          )}
                        >
                          {initials}
                        </div>
                        {user.online && (
                          <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{name}</span>
                          {user.isVerified && (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {user.username && (
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          )}
                          {user.role && user.role !== 'CLIENT' && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5">
                              {user.role === 'SPECIALIST' ? 'کسب‌وکار' : user.role === 'ADMIN' ? 'مدیر' : user.role}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isCreatingConversation ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        user.online && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-emerald-300 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-5"
                          >
                            آنلاین
                          </Badge>
                        )
                      )}
                    </button>
                  );
                })}
            </div>
          </ScrollArea>
        ) : (
          /* ── Conversation List ── */
          <ScrollArea className="min-h-0 flex-1" role="list" aria-label="مکالمات">
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'مکالمه‌ای یافت نشد' : 'هنوز مکالمه‌ای ندارید'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleToggleNewChat}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    شروع گفتگوی جدید
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {filteredConversations.map((conv) => {
                  const convName = `${conv.otherUser?.firstName ?? ''} ${conv.otherUser?.lastName ?? ''}`.trim() || 'کاربر';
                  const isSelected = conv.id === activeConversationId;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg p-3 text-right transition-all duration-150',
                        isSelected
                          ? 'bg-primary/5 border border-primary/20'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                      role="listitem"
                      aria-label={`مکالمه با ${convName}${conv.unreadCount > 0 ? `، ${conv.unreadCount} پیام خوانده نشده` : ''}`}
                    >
                      {/* Avatar */}
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

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{convName}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-muted-foreground" style={{ maxWidth: '200px' }}>
                            {conv.lastMessage
                              ? (conv.lastMessage.length > 40 ? conv.lastMessage.slice(0, 40) + '...' : conv.lastMessage)
                              : 'شروع گفتگو...'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-xs">
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
        )}
      </div>

      {/* ── Message Area ── */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          !showMessages ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                onClick={handleBack}
                aria-label="بازگشت"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="relative">
                {otherUser?.avatar ? (
                  <div
                    className="h-10 w-10 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${otherUser.avatar})` }}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white',
                      getAvatarColor(
                        `${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim() || 'کاربر'
                      )
                    )}
                  >
                    {getInitials(`${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim() || 'کاربر')}
                  </div>
                )}
                {otherUser?.online && (
                  <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {`${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim() || 'کاربر'}
                </h3>
                <p
                  className={cn(
                    'text-xs',
                    otherUser?.online
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {otherUser?.online ? 'آنلاین' : 'آفلاین'}
                </p>
              </div>
              {/* Call button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="تماس"
                title="تماس صوتی"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="min-h-0 flex-1 px-4 py-3">
              <div className="space-y-3" role="log" aria-label="پیام‌ها" aria-live="polite">
                {/* System message */}
                <div className="flex justify-center py-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    مکالمه آغاز شد
                  </span>
                </div>

                {isLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      هنوز پیامی ارسال نشده
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      اولین پیام خود را ارسال کنید!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    const isHovered = hoveredMsgId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'group relative flex',
                          isMe ? 'justify-start' : 'justify-end'
                        )}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {/* Reply button on hover (desktop) */}
                        <button
                          type="button"
                          onClick={() => startReply(msg)}
                          className={cn(
                            'absolute top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full',
                            'bg-background/80 border border-border/60 shadow-sm backdrop-blur-sm',
                            'text-muted-foreground hover:text-primary hover:bg-primary/10',
                            'transition-all duration-150',
                            isMe ? 'left-0 -translate-x-full ml-1' : 'right-0 translate-x-full mr-1',
                            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none',
                            'max-md:hidden'
                          )}
                          aria-label="پاسخ"
                          title="پاسخ به این پیام"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <div
                          className={cn(
                            'relative max-w-[75%] rounded-2xl px-4 py-2.5',
                            isMe
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md bg-muted'
                          )}
                        >
                          {/* Reply quote */}
                          {replyTo && replyTo.messageId === msg.id && (
                            <div className="sr-only">در حال پاسخ به این پیام</div>
                          )}
                          <p className="text-sm leading-7">{msg.content}</p>
                          <div
                            className={cn(
                              'mt-1 flex items-center gap-1.5 text-[10px]',
                              isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            )}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <CheckCheck
                                className={cn(
                                  'h-3.5 w-3.5',
                                  msg.isRead
                                    ? 'text-emerald-400'
                                    : 'text-primary-foreground/40'
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center gap-2 border-t px-4 py-2 bg-muted/30">
                <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    پاسخ به {replyTo.senderName}
                  </p>
                  <p className="text-xs text-muted-foreground/60 truncate">
                    {replyTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t px-4 py-3">
              <div className="flex items-center gap-2">
                {/* Emoji picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="ایموجی">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" side="top">
                    <div className="grid grid-cols-6 gap-1">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Input
                  ref={inputRef}
                  placeholder="پیام خود را بنویسید..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-10 text-sm flex-1"
                  disabled={isSendingMessage}
                />

                {/* Attach */}
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="فایل">
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Send */}
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 p-0"
                  aria-label="ارسال پیام"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — no conversation selected */
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">یک گفتگو انتخاب کنید</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  از لیست سمت راست یک مکالمه را انتخاب کنید یا گفتگوی جدید شروع کنید
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleToggleNewChat}
                className="mt-2"
              >
                <Plus className="h-4 w-4 ml-1" />
                گفتگوی جدید
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
