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
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
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

// ─── Reply & Emoji types ────────────────────────────────────────────────────

interface ReplyInfo {
  messageId: string;
  senderName: string;
  content: string;
}

interface ExtendedMessage extends Message {
  replyTo?: ReplyInfo;
}

const QUICK_EMOJIS = [
  '❤️', '😊', '👍', '😂', '🎉', '😮',
  '😢', '😡', '👏', '🙏', '💪', '✨',
  '🎯', '💯', '🔥', '⭐', '🌟', '👌',
  '🤝', '📌', '🔔', '✅', '❌', '💯',
];

// ─── Auto-replies pool ───────────────────────────────────────────────────────

const AUTO_REPLIES = [
  'باشه، حتماً بررسی می‌کنم.',
  'ممنون از اطلاع‌رسانی.',
  'خیلی عالی، ادامه بدید.',
  'فهمیدم، ممنون.',
  'بله، با کمال میل.',
  'حتماً، در اسرع وقت انجام می‌دم.',
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface MockConversation {
  id: string;
  name: string;
  lastMessage: string;
  timeAgo: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

const mockConversations: MockConversation[] = [
  {
    id: 'conv-1',
    name: 'علی محمدی',
    lastMessage: 'سلام، من پروژه رو بررسی کردم و آماده شروع هستم',
    timeAgo: '۵ دقیقه پیش',
    unreadCount: 2,
    isOnline: true,
    messages: [
      { id: 'm1', conversationId: 'conv-1', senderId: 'other', content: 'سلام، وقت بخیر', type: 'TEXT', isRead: true, createdAt: '10:00' },
      { id: 'm2', conversationId: 'conv-1', senderId: 'me', content: 'سلام، وقت شما هم بخیر', type: 'TEXT', isRead: true, createdAt: '10:01' },
      { id: 'm3', conversationId: 'conv-1', senderId: 'other', content: 'من می‌تونم این پروژه رو انجام بدم', type: 'TEXT', isRead: true, createdAt: '10:05' },
      { id: 'm4', conversationId: 'conv-1', senderId: 'me', content: 'قیمت پیشنهادی شما چقدره؟', type: 'TEXT', isRead: true, createdAt: '10:10' },
      { id: 'm5', conversationId: 'conv-1', senderId: 'other', content: 'برای این پروژه حدود ۵ میلیون تومان پیشنهاد می‌دم', type: 'TEXT', isRead: true, createdAt: '10:15' },
      { id: 'm6', conversationId: 'conv-1', senderId: 'me', content: 'زمان تحویل چقدره؟', type: 'TEXT', isRead: true, createdAt: '10:20' },
      { id: 'm7', conversationId: 'conv-1', senderId: 'other', content: 'حدود ۱۰ روز کاری', type: 'TEXT', isRead: false, createdAt: '10:25' },
      { id: 'm8', conversationId: 'conv-1', senderId: 'other', content: 'سلام، من پروژه رو بررسی کردم و آماده شروع هستم', type: 'TEXT', isRead: false, createdAt: '10:30' },
    ],
  },
  {
    id: 'conv-2',
    name: 'سارا احمدی',
    lastMessage: 'فایل‌های پروژه رو براتون فرستادم',
    timeAgo: '۳۰ دقیقه پیش',
    unreadCount: 1,
    isOnline: true,
    messages: [
      { id: 'm1', conversationId: 'conv-2', senderId: 'me', content: 'سلام خانم احمدی، وضعیت پروژه چطوره؟', type: 'TEXT', isRead: true, createdAt: '09:30' },
      { id: 'm2', conversationId: 'conv-2', senderId: 'other', content: 'سلام، پروژه در حال انجام هست', type: 'TEXT', isRead: true, createdAt: '09:35' },
      { id: 'm3', conversationId: 'conv-2', senderId: 'me', content: 'عالی، کی آماده‌ست تحویل بدید؟', type: 'TEXT', isRead: true, createdAt: '09:40' },
      { id: 'm4', conversationId: 'conv-2', senderId: 'other', content: 'فایل‌های پروژه رو براتون فرستادم', type: 'TEXT', isRead: false, createdAt: '09:45' },
      { id: 'm5', conversationId: 'conv-2', senderId: 'other', content: 'لطفاً بررسی کنید و نظرتون رو بدید', type: 'TEXT', isRead: false, createdAt: '09:46' },
      { id: 'm6', conversationId: 'conv-2', senderId: 'me', content: 'ممنون، حتماً بررسی می‌کنم', type: 'TEXT', isRead: true, createdAt: '09:50' },
    ],
  },
  {
    id: 'conv-3',
    name: 'رضا کریمی',
    lastMessage: 'ممنون از همکاری خوبتون',
    timeAgo: '۲ ساعت پیش',
    unreadCount: 0,
    isOnline: false,
    messages: [
      { id: 'm1', conversationId: 'conv-3', senderId: 'other', content: 'سلام، آیا پروژه طراحی لوگو رو انجام می‌دید؟', type: 'TEXT', isRead: true, createdAt: '08:00' },
      { id: 'm2', conversationId: 'conv-3', senderId: 'me', content: 'بله، با کمال میل', type: 'TEXT', isRead: true, createdAt: '08:10' },
      { id: 'm3', conversationId: 'conv-3', senderId: 'other', content: 'قیمتش چقدر میشه؟', type: 'TEXT', isRead: true, createdAt: '08:15' },
      { id: 'm4', conversationId: 'conv-3', senderId: 'me', content: 'حدود ۲ میلیون تومان', type: 'TEXT', isRead: true, createdAt: '08:20' },
      { id: 'm5', conversationId: 'conv-3', senderId: 'other', content: 'خوبه، شروع می‌کنیم', type: 'TEXT', isRead: true, createdAt: '08:25' },
      { id: 'm6', conversationId: 'conv-3', senderId: 'other', content: 'ممنون از همکاری خوبتون', type: 'TEXT', isRead: true, createdAt: '08:30' },
    ],
  },
  {
    id: 'conv-4',
    name: 'مینا حسینی',
    lastMessage: 'آیا امکان تغییر جزئیات پروژه وجود داره؟',
    timeAgo: '۱ روز پیش',
    unreadCount: 3,
    isOnline: false,
    messages: [
      { id: 'm1', conversationId: 'conv-4', senderId: 'other', content: 'سلام، من در مورد پروژه سوال داشتم', type: 'TEXT', isRead: true, createdAt: '14:00' },
      { id: 'm2', conversationId: 'conv-4', senderId: 'me', content: 'بفرمایید، در خدمتم', type: 'TEXT', isRead: true, createdAt: '14:05' },
      { id: 'm3', conversationId: 'conv-4', senderId: 'other', content: 'آیا امکان تغییر جزئیات پروژه وجود داره؟', type: 'TEXT', isRead: false, createdAt: '14:10' },
      { id: 'm4', conversationId: 'conv-4', senderId: 'other', content: 'می‌خوام رنگ‌بندی رو تغییر بدم', type: 'TEXT', isRead: false, createdAt: '14:11' },
      { id: 'm5', conversationId: 'conv-4', senderId: 'other', content: 'و فونت‌ها هم عوض بشه', type: 'TEXT', isRead: false, createdAt: '14:12' },
      { id: 'm6', conversationId: 'conv-4', senderId: 'me', content: 'البته، بفرمایید چه تغییراتی مد نظرتون هست', type: 'TEXT', isRead: true, createdAt: '14:20' },
      { id: 'm7', conversationId: 'conv-4', senderId: 'me', content: 'هزینه اضافی نداره', type: 'TEXT', isRead: true, createdAt: '14:22' },
    ],
  },
  {
    id: 'conv-5',
    name: 'حسن نجفی',
    lastMessage: 'پروژه با موفقیت تحویل داده شد',
    timeAgo: '۳ روز پیش',
    unreadCount: 0,
    isOnline: true,
    messages: [
      { id: 'm1', conversationId: 'conv-5', senderId: 'me', content: 'سلام آقای نجفی، پروژه آماده‌ست', type: 'TEXT', isRead: true, createdAt: '11:00' },
      { id: 'm2', conversationId: 'conv-5', senderId: 'other', content: 'عالی، بررسی می‌کنم', type: 'TEXT', isRead: true, createdAt: '11:30' },
      { id: 'm3', conversationId: 'conv-5', senderId: 'other', content: 'خیلی خوب شده، ممنون', type: 'TEXT', isRead: true, createdAt: '12:00' },
      { id: 'm4', conversationId: 'conv-5', senderId: 'me', content: 'خواهش می‌کنم، خوشحالم که راضی هستید', type: 'TEXT', isRead: true, createdAt: '12:05' },
      { id: 'm5', conversationId: 'conv-5', senderId: 'other', content: 'پروژه با موفقیت تحویل داده شد', type: 'TEXT', isRead: true, createdAt: '12:10' },
    ],
  },
  {
    id: 'conv-6',
    name: 'فاطمه رضایی',
    lastMessage: 'برای مشاوره رایگان تماس بگیرید',
    timeAgo: '۱ هفته پیش',
    unreadCount: 0,
    isOnline: false,
    messages: [
      { id: 'm1', conversationId: 'conv-6', senderId: 'other', content: 'سلام، من نیاز به مشاوره دارم', type: 'TEXT', isRead: true, createdAt: '16:00' },
      { id: 'm2', conversationId: 'conv-6', senderId: 'me', content: 'سلام، در چه زمینه‌ای نیاز به مشاوره دارید؟', type: 'TEXT', isRead: true, createdAt: '16:10' },
      { id: 'm3', conversationId: 'conv-6', senderId: 'other', content: 'در زمینه طراحی وب‌سایت', type: 'TEXT', isRead: true, createdAt: '16:15' },
      { id: 'm4', conversationId: 'conv-6', senderId: 'me', content: 'برای مشاوره رایگان تماس بگیرید', type: 'TEXT', isRead: true, createdAt: '16:20' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatPanel() {
  const { isAuthenticated, setAuthModalOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ExtendedMessage } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = mockConversations.find((c) => c.id === selectedConversationId) ?? null;

  const filteredConversations = mockConversations.filter((c) =>
    c.name.includes(searchQuery) || c.lastMessage.includes(searchQuery)
  );

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages, isTyping, scrollToBottom]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleSelectConversation = (conv: MockConversation) => {
    setSelectedConversationId(conv.id);
    setConversationMessages([...conv.messages] as ExtendedMessage[]);
    setShowMessages(true);
    setIsTyping(false);
    setReplyTo(null);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const handleBack = () => {
    setShowMessages(false);
    setSelectedConversationId(null);
    setIsTyping(false);
    setReplyTo(null);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    const msg: ExtendedMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: 'me',
      content: newMessage.trim(),
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      ...(replyTo ? { replyTo: { ...replyTo } } : {}),
    };

    setConversationMessages((prev) => [...prev, msg]);
    setNewMessage('');
    setReplyTo(null);
    inputRef.current?.focus();

    // Show typing indicator and schedule auto-reply
    setIsTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);

      const randomReply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const replyMsg: ExtendedMessage = {
        id: `reply-${Date.now()}`,
        conversationId: selectedConversationId,
        senderId: 'other',
        content: randomReply,
        type: 'TEXT',
        isRead: false,
        createdAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      setConversationMessages((prev) => [...prev, replyMsg]);

      // Mark the user's message as read after reply
      setConversationMessages((prev) =>
        prev.map((m) => {
          if (m.id === msg.id) {
            return { ...m, isRead: true };
          }
          return m;
        })
      );
    }, 2000);
  };

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
    // Restore cursor after the inserted emoji
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  }, [newMessage]);

  // ─── Reply helper ────────────────────────────────────────────────────────
  const startReply = useCallback((msg: ExtendedMessage) => {
    const isMe = msg.senderId === 'me';
    setReplyTo({
      messageId: msg.id,
      senderName: isMe ? 'شما' : (selectedConversation?.name ?? 'ناشناس'),
      content: msg.content,
    });
    setContextMenu(null);
    inputRef.current?.focus();
  }, [selectedConversation?.name]);

  const handleMessageContextMenu = useCallback((e: React.MouseEvent, msg: ExtendedMessage) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
    setHoveredMsgId(msg.id);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

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
              برای مشاهده پیام‌های خود، ابتدا وارد حساب کاربری شوید
            </p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} className="mt-2" data-href="/dashboard" title="ورود به حساب کاربری">
            ورود به حساب کاربری
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
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="مکالمه جدید" title="ایجاد مکالمه جدید">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی مکالمه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pr-9"
              aria-label="جستجوی مکالمه"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="min-h-0 flex-1" role="list" aria-label="مکالمات">
          <div className="space-y-0.5 p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg p-3 text-right transition-all duration-150',
                  selectedConversationId === conv.id
                    ? 'bg-primary/5 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                )}
                role="listitem"
                aria-label={`مکالمه با ${conv.name}${conv.unreadCount > 0 ? `، ${conv.unreadCount} پیام خوانده نشده` : ''}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white',
                      getAvatarColor(conv.name)
                    )}
                  >
                    {getInitials(conv.name)}
                  </div>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{conv.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{conv.timeAgo}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted-foreground" style={{ maxWidth: '200px' }}>
                      {conv.lastMessage.length > 40 ? conv.lastMessage.slice(0, 40) + '...' : conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-xs">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">مکالمه‌ای یافت نشد</p>
              </div>
            )}
          </div>
        </ScrollArea>
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
                className="h-11 w-11 md:hidden"
                onClick={handleBack}
                aria-label="بازگشت به لیست مکالمات"
                title="بازگشت به لیست مکالمات"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="relative">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white',
                    getAvatarColor(selectedConversation.name)
                  )}
                >
                  {getInitials(selectedConversation.name)}
                </div>
                {selectedConversation.isOnline && (
                  <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{selectedConversation.name}</h3>
                <p
                  className={cn(
                    'text-xs transition-all duration-150',
                    isTyping
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selectedConversation.isOnline
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                  )}
                >
                  {isTyping ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      در حال نوشتن
                    </span>
                  ) : selectedConversation.isOnline ? (
                    'آنلاین'
                  ) : (
                    'آفلاین'
                  )}
                </p>
              </div>
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

                {conversationMessages.map((msg) => {
                  const isMe = msg.senderId === 'me';
                  const isHovered = hoveredMsgId === msg.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn('group relative flex', isMe ? 'justify-start' : 'justify-end')}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { setHoveredMsgId(null); }}
                      onContextMenu={(e) => handleMessageContextMenu(e, msg)}
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
                        aria-label="پاسخ به این پیام"
                        title="پاسخ"
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
                        {msg.replyTo && (
                          <div
                            className={cn(
                              'mb-1.5 rounded-md border-s-2 ps-2 pe-2 pt-1 pb-1 text-xs',
                              isMe
                                ? 'border-s-primary-foreground/40 bg-primary-foreground/10'
                                : 'border-s-muted-foreground/30 bg-muted-foreground/5'
                            )}
                          >
                            <span className={cn(
                              'font-semibold',
                              isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            )}>
                              در پاسخ به: {msg.replyTo.senderName}
                            </span>
                            <p className={cn(
                              'mt-0.5 truncate',
                              isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            )}>
                              {msg.replyTo.content.length > 60 ? msg.replyTo.content.slice(0, 60) + '...' : msg.replyTo.content}
                            </p>
                          </div>
                        )}
                        <p className="text-sm leading-7">{msg.content}</p>
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1.5 text-[10px]',
                            isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                          )}
                        >
                          <span>{msg.createdAt}</span>
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
                })}

                {/* Context menu for reply (right-click / long-press) */}
                {contextMenu && (
                  <div
                    className="fixed z-50 rounded-lg border bg-popover p-1 shadow-lg backdrop-blur-sm"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                  >
                    <button
                      type="button"
                      onClick={() => startReply(contextMenu.msg)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Reply className="h-4 w-4" />
                      <span>پاسخ</span>
                    </button>
                  </div>
                )}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-muted px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <Separator />

            {/* Reply indicator bar */}
            {replyTo && (
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">
                    در پاسخ به: {replyTo.senderName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground/70">
                    {replyTo.content.length > 50 ? replyTo.content.slice(0, 50) + '...' : replyTo.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setReplyTo(null)}
                  aria-label="لغو پاسخ"
                  title="لغو پاسخ"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 p-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 text-muted-foreground"
                aria-label="پیوست فایل"
                title="پیوست فایل به پیام"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Emoji picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-amber-500"
                    aria-label="درج ایموجی"
                    title="درج ایموجی"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <div className="grid grid-cols-6 gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-accent transition-colors"
                        aria-label={emoji}
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
                className="flex-1 h-11"
                aria-label="متن پیام"
              />
              <Button
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                aria-label="ارسال پیام"
                title="ارسال پیام"
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">یک مکالمه را انتخاب کنید</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                برای شروع گفتگو، یکی از مکالمات را انتخاب کنید
              </p>
            </div>
          </div>
        )}
      </div>
      <noscript>
        <div className="sr-only">
          <h1>پیام‌ها - نیاز فایندر</h1>
          <p>بخش پیام‌ها برای مدیریت مکالمات بین کاربران و کسب‌وکارها در پلتفرم نیاز فایندر.</p>
        </div>
      </noscript>
    </div>
  );
}
