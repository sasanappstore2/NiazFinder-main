import type { Conversation, Message } from '@/lib/types';

// حداکثر تعداد مکالمات قابل ذخیره در حافظه
const MAX_CONVERSATIONS = 200;

// حداکثر تعداد پیام‌های کش شده برای هر مکالمه
const MAX_CACHED_MESSAGES = 100;

export interface CachedMessageGroup {
  conversationId: string;
  messages: Message[];
  hasMore: boolean;
  lastFetchAt: number;
}

// رابط وضعیت تایپ کردن کاربر در مکالمه
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  lastTypingAt: number;
}

export interface ChatState {
  // لیست مکالمات
  conversations: Conversation[];
  activeConversationId: string | null;
  // کش پیام‌ها - ذخیره پیام‌های هر مکالمه
  messageCache: Map<string, CachedMessageGroup>;
  // وضعیت لودینگ برای هر مکالمه
  loadingMessages: Set<string>;
  // تعداد پیام‌های خوانده نشده برای هر مکالمه
  unreadCounts: Record<string, number>;
  // وضعیت تایپ کردن
  typingIndicators: TypingIndicator[];
  // آنکاین بودن کاربران
  onlineUsers: Set<string>;
  // انکر پیام - برای deep linking به پیام خاص (?msg=123)
  messageAnchor: string | null;
  // توابع مدیریت مکالمات
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  // توابع مدیریت پیام‌ها
  setMessages: (conversationId: string, messages: Message[], hasMore?: boolean) => void;
  addMessage: (message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, data: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearMessageCache: (conversationId?: string) => void;
  getMessages: (conversationId: string) => Message[];
  hasMoreMessages: (conversationId: string) => boolean;
  // توابع مدیریت وضعیت لودینگ
  setLoadingMessages: (conversationId: string, loading: boolean) => void;
  // توابع مدیریت پیام‌های خوانده نشده
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  getTotalUnread: () => number;
  // توابع مدیریت وضعیت تایپ کردن
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  isUserTyping: (conversationId: string, userId: string) => boolean;
  // توابع مدیریت وضعیت آنلاین
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  isUserOnline: (userId: string) => boolean;
  // مدیریت انکر پیام
  setMessageAnchor: (messageId: string | null) => void;
}

export const createChatStore = (
  set: (fn: (state: ChatState) => Partial<ChatState>) => void,
  get: () => ChatState,
): ChatState => ({
  conversations: [],
  activeConversationId: null,
  messageCache: new Map(),
  loadingMessages: new Set(),
  unreadCounts: {},
  typingIndicators: [],
  onlineUsers: new Set(),
  messageAnchor: null,

  // مدیریت مکالمات
  setConversations: (conversations: Conversation[]) =>
    set({
      conversations: conversations.slice(0, MAX_CONVERSATIONS),
      // مقداردهی اولیه تعداد پیام‌های خوانده نشده از داده مکالمات
      unreadCounts: conversations.reduce<Record<string, number>>((acc, conv) => {
        acc[conv.id] = conv.unreadCount || 0;
        return acc;
      }, {}),
    }),

  setActiveConversationId: (id: string | null) => {
    set({ activeConversationId: id });
    // هنگام باز کردن مکالمه، پیام‌های خوانده نشده آن صفر می‌شود
    if (id) {
      get().clearUnread(id);
    }
  },

  addConversation: (conversation: Conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations].slice(0, MAX_CONVERSATIONS),
    })),

  updateConversation: (id: string, data: Partial<Conversation>) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  removeConversation: (id: string) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),

  // مدیریت پیام‌ها
  setMessages: (conversationId: string, messages: Message[], hasMore = false) =>
    set((state) => {
      const newCache = new Map(state.messageCache);
      newCache.set(conversationId, {
        conversationId,
        messages: messages.slice(0, MAX_CACHED_MESSAGES),
        hasMore,
        lastFetchAt: Date.now(),
      });
      return { messageCache: newCache };
    }),

  addMessage: (message: Message) =>
    set((state) => {
      const newCache = new Map(state.messageCache);
      const existing = newCache.get(message.conversationId);

      if (existing) {
        // جلوگیری از پیام‌های تکراری
        if (existing.messages.some((m) => m.id === message.id)) return state;
        newCache.set(message.conversationId, {
          ...existing,
          messages: [...existing.messages, message].slice(-MAX_CACHED_MESSAGES),
          lastFetchAt: Date.now(),
        });
      } else {
        newCache.set(message.conversationId, {
          conversationId: message.conversationId,
          messages: [message],
          hasMore: true,
          lastFetchAt: Date.now(),
        });
      }

      // بروزرسانی آخرین پیام در لیست مکالمات
      const newConversations = state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message.content, lastMessageAt: message.createdAt }
          : c
      );

      return { messageCache: newCache, conversations: newConversations };
    }),

  updateMessage: (conversationId: string, messageId: string, data: Partial<Message>) =>
    set((state) => {
      const newCache = new Map(state.messageCache);
      const existing = newCache.get(conversationId);
      if (!existing) return state;

      newCache.set(conversationId, {
        ...existing,
        messages: existing.messages.map((m) =>
          m.id === messageId ? { ...m, ...data } : m
        ),
      });

      return { messageCache: newCache };
    }),

  removeMessage: (conversationId: string, messageId: string) =>
    set((state) => {
      const newCache = new Map(state.messageCache);
      const existing = newCache.get(conversationId);
      if (!existing) return state;

      newCache.set(conversationId, {
        ...existing,
        messages: existing.messages.filter((m) => m.id !== messageId),
      });

      return { messageCache: newCache };
    }),

  clearMessageCache: (conversationId?: string) =>
    set((state) => {
      if (conversationId) {
        const newCache = new Map(state.messageCache);
        newCache.delete(conversationId);
        return { messageCache: newCache };
      }
      return { messageCache: new Map() };
    }),

  getMessages: (conversationId: string): Message[] => {
    const cached = get().messageCache.get(conversationId);
    return cached?.messages || [];
  },

  hasMoreMessages: (conversationId: string): boolean => {
    const cached = get().messageCache.get(conversationId);
    return cached?.hasMore ?? true;
  },

  // مدیریت وضعیت لودینگ
  setLoadingMessages: (conversationId: string, loading: boolean) =>
    set((state) => {
      const newSet = new Set(state.loadingMessages);
      if (loading) {
        newSet.add(conversationId);
      } else {
        newSet.delete(conversationId);
      }
      return { loadingMessages: newSet };
    }),

  // مدیریت پیام‌های خوانده نشده
  incrementUnread: (conversationId: string) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
      },
    })),

  clearUnread: (conversationId: string) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: 0,
      },
    })),

  setUnreadCounts: (counts: Record<string, number>) =>
    set({ unreadCounts: counts }),

  getTotalUnread: (): number => {
    const { unreadCounts } = get();
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  },

  // مدیریت وضعیت تایپ کردن
  setTyping: (indicator: TypingIndicator) =>
    set((state) => {
      const filtered = state.typingIndicators.filter(
        (t) => !(t.conversationId === indicator.conversationId && t.userId === indicator.userId)
      );
      return { typingIndicators: [...filtered, indicator] };
    }),

  clearTyping: (conversationId: string, userId: string) =>
    set((state) => ({
      typingIndicators: state.typingIndicators.filter(
        (t) => !(t.conversationId === conversationId && t.userId === userId)
      ),
    })),

  isUserTyping: (conversationId: string, userId: string): boolean => {
    const { typingIndicators } = get();
    const indicator = typingIndicators.find(
      (t) => t.conversationId === conversationId && t.userId === userId && t.isTyping
    );
    if (!indicator) return false;
    // وضعیت تایپ کردن پس از ۵ ثانیه منقضی می‌شود
    return Date.now() - indicator.lastTypingAt < 5000;
  },

  // مدیریت وضعیت آنلاین
  setOnlineUsers: (userIds: string[]) =>
    set({ onlineUsers: new Set(userIds) }),

  setUserOnline: (userId: string, online: boolean) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      if (online) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return { onlineUsers: newSet };
    }),

  isUserOnline: (userId: string): boolean => {
    return get().onlineUsers.has(userId);
  },

  // مدیریت انکر پیام
  setMessageAnchor: (messageId: string | null) => set({ messageAnchor: messageId }),
});
