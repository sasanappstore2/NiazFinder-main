/**
 * App store network policy:
 * - All app-facing calls go through Next.js API routes (`/api/...`)
 * - Use shared `apiFetch` from `@/lib/api-client` for auth/error handling
 * - Do not call backend port 4000 directly from this store
 */

import { create } from 'zustand';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import type {
  User,
  Notification,
  Conversation,
  Message,
  ServiceRequest,
  Category,
  Wallet,
  Transaction,
  DashboardStats,
} from './types';
import { CHAT_CONTACT_SHARE_PREFIX } from '@/lib/chat/contact-share';
import { chatMessageListPreview } from '@/lib/chat/contact-share';
import { MESSAGE_DELETED_TOMBSTONE } from '@/lib/chat/message-delete';
import { buildReplyToQuote } from '@/lib/chat/reply-quote';
import {
  isAllowedReactionEmoji,
  removeReactionFromList,
  upsertReactionInList,
} from '@/lib/chat/reactions';
import {
  tryDeleteMessage,
  tryEditMessage,
  tryJoinConversation,
  tryJoinConversations,
  tryPinMessage,
  tryReactToMessage,
} from '@/lib/chat/socket-bridge';
import { mapApiConversationItem } from '@/lib/chat/map-conversation-item';
import { mergeOtherUserPresence } from '@/lib/chat/merge-presence';
import { canEditChatMessage } from '@/lib/chat/message-edit';
import { streamAiAgentChat } from '@/lib/ai-agent/stream-client';

// ============ Store Interface ============

interface AppState {
  // Auth (local)
  currentUser: User | null;
  isAuthenticated: boolean;
  /** True after initializeFromStorage() has finished (avoids auth flash on refresh). */
  authHydrated: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;

  // Auth (API)
  authToken: string | null;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  initializeFromStorage: () => Promise<void>;
  loginAPI: (email: string, password: string) => Promise<boolean>;
  loginWithPhone: (
    phone: string,
    code: string,
    intent?: 'login' | 'register'
  ) => Promise<{
    success: boolean;
    isNewUser: boolean;
    needsPassword?: boolean;
    error: string | null;
  }>;
  loginWithPhonePassword: (
    phone: string,
    password: string
  ) => Promise<{ success: boolean; error: string | null }>;
  registerWithPhonePassword: (
    phone: string,
    password: string,
    code: string
  ) => Promise<{ success: boolean; error: string | null }>;
  registerAPI: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) => Promise<boolean>;
  logoutAPI: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateProfileAPI: (data: Record<string, any>) => Promise<boolean>;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;

  // In-site voice call overlay
  voiceCallOpen: boolean;
  voiceCallTarget: import('@/lib/voice/voice-call-peer').VoiceCallPeer | null;
  voiceCallType: 'incoming' | 'outgoing';
  voiceCallStatus: 'idle' | 'ringing' | 'active' | 'ended';
  voiceCallId: string | null;
  voiceCallMuted: boolean;
  voiceCallDuration: number;
  openVoiceCall: (
    user: import('@/lib/voice/voice-call-peer').VoiceCallPeer,
    conversationId?: string
  ) => void;
  closeVoiceCall: () => void;
  acceptVoiceCall: () => void;
  rejectVoiceCall: () => void;
  hangupVoiceCall: () => void;
  toggleVoiceCallMute: () => void;

  // Notifications (local)
  notifications: Notification[];
  unreadNotificationCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Notifications (API)
  fetchNotifications: () => Promise<void>;
  markNotificationReadAPI: (id: string) => Promise<void>;
  markAllNotificationsReadAPI: () => Promise<void>;

  // Chat (local)
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  addOrUpdateConversation: (conv: Partial<Conversation> & { id: string }) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  /** Realtime «در حال نوشتن» طرف مقابل (از سوکت) */
  peerTyping: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    displayName?: string;
    updatedAt: number;
  } | null;
  applyPeerTypingFromSocket: (data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    user?: { firstName?: string; lastName?: string };
  }) => void;
  clearPeerTyping: (conversationId: string) => void;
  /** conversationId → timestamp آخرین تایپینگ طرف (برای لیست مکالمات) */
  typingActivityByConvId: Record<string, number>;
  isConversationTyping: (conversationId: string) => boolean;
  /** طرف مقابل پیام‌های ما را خوانده — تیک سین */
  applyReadReceipt: (conversationId: string, readerId: string) => void;
  applyMessageReaction: (payload: {
    messageId: string;
    conversationId: string;
    userId: string;
    emoji: string;
    eventType: 'added' | 'updated' | 'removed';
    user?: { id: string; firstName: string; lastName: string; avatar?: string };
  }) => void;
  applyMessageDeleted: (payload: {
    messageId: string;
    conversationId: string;
    forEveryone: boolean;
    userId?: string;
  }) => void;
  applyMessageEdited: (payload: {
    messageId: string;
    conversationId: string;
    content: string;
    editedAt?: string | null;
  }) => void;
  applyMessagePinChanged: (payload: {
    messageId: string;
    conversationId: string;
    isPinned: boolean;
    pinnedBy?: string | null;
    pinnedAt?: string | null;
  }) => void;
  reactToMessage: (messageId: string, emoji: string) => Promise<boolean>;
  deleteChatMessage: (messageId: string, forEveryone: boolean) => Promise<boolean>;
  editChatMessage: (messageId: string, content: string) => Promise<boolean>;
  pinChatMessage: (
    messageId: string,
    conversationId: string,
    unpin: boolean
  ) => Promise<boolean>;

  // Chat (API)
  messages: Message[];
  fetchConversations: () => Promise<void>;
  fetchConversationMessages: (id: string) => Promise<Message[]>;
  sendMessage: (
    conversationId: string,
    content: string,
    type?: string,
    options?: { replyToId?: string }
  ) => Promise<boolean>;
  sendPlatformAgentMessage: (
    conversationId: string,
    content: string,
    options?: { replyToId?: string; platformBotUserId?: string }
  ) => Promise<{ ok: boolean; code?: string }>;

  // Bookmarks
  bookmarkedRequests: string[];
  bookmarkedSpecialists: string[];
  setBookmarkIds: (requestIds: string[], specialistIds: string[]) => void;
  applyBookmarkToggle: (type: 'request' | 'specialist', id: string, isBookmarked: boolean) => void;
  fetchBookmarks: () => Promise<void>;
  toggleBookmarkRequest: (id: string) => void;
  toggleBookmarkSpecialist: (id: string) => void;
  isRequestBookmarked: (id: string) => boolean;
  isSpecialistBookmarked: (id: string) => boolean;

  // Compare
  compareSpecialistIds: string[];
  toggleCompareSpecialist: (id: string) => void;
  clearCompareList: () => void;

  // Requests (API)
  requests: ServiceRequest[];
  currentRequest: ServiceRequest | null;
  fetchRequests: (params?: Record<string, string>) => Promise<void>;
  fetchRequestDetail: (id: string) => Promise<ServiceRequest | null>;
  createRequest: (data: Record<string, any>) => Promise<boolean>;

  // Proposals (API)
  fetchProposals: (requestId: string) => Promise<any[]>;
  submitProposal: (data: { requestId: string; price: number; deliveryTime?: number; deliveryUnit?: string; message: string }) => Promise<boolean>;
  updateProposalStatus: (id: string, status: string) => Promise<boolean>;
  acceptProposal: (
    proposalId: string
  ) => Promise<{ success: boolean; proposerUserId?: string }>;

  // Specialists (API)
  specialists: any[];
  currentSpecialist: any | null;
  fetchSpecialists: (params?: Record<string, string>) => Promise<void>;
  fetchSpecialistProfile: (id: string) => Promise<any>;

  // Categories (API)
  categories: Category[];
  fetchCategories: () => Promise<Category[]>;

  // Reviews (API)
  submitReview: (data: { targetUserId: string; proposalId: string; rating: number; comment: string }) => Promise<boolean>;

  // Wallet (API)
  wallet: Wallet | null;
  transactions: Transaction[];
  fetchWallet: () => Promise<Wallet | null>;
  fetchTransactions: () => Promise<Transaction[]>;

  // Dashboard (API)
  dashboardStats: DashboardStats | null;
  fetchDashboardStats: () => Promise<DashboardStats | null>;
}

// ============ Token storage key ============

const TOKEN_KEY = 'needfinder_auth_token';
const LEGACY_TOKEN_KEY = 'nf_auth_token';

function mapApiUserToLocal(apiUser: Record<string, unknown>): User {
  return {
    id: apiUser.id as string,
    email: apiUser.email as string,
    phone: (apiUser.phone as string | null) ?? undefined,
    phoneVerified: Boolean(apiUser.phoneVerified),
    username: (apiUser.username as string | null) ?? undefined,
    firstName: apiUser.firstName as string,
    lastName: apiUser.lastName as string,
    displayName: (apiUser.displayName as string | null) ?? undefined,
    avatar: (apiUser.avatar as string | null) ?? undefined,
    bio: (apiUser.bio as string | null) ?? undefined,
    city: (apiUser.city as string | null) ?? undefined,
    province: (apiUser.province as string | null) ?? undefined,
    role: apiUser.role as User['role'],
    isVerified: apiUser.isVerified as boolean,
    isActive: true,
    online: true,
    rating: (apiUser.rating as number | undefined) ?? 0,
    projectCount: (apiUser.projectCount as number | undefined) ?? 0,
    completionRate: (apiUser.completionRate as number | undefined) ?? 0,
    responseRate: (apiUser.responseRate as number | undefined) ?? 0,
    createdAt:
      typeof apiUser.createdAt === 'string'
        ? apiUser.createdAt
        : new Date(apiUser.createdAt as string | Date).toISOString(),
  };
}

function applyPhoneAuthSuccess(
  apiUser: Record<string, unknown>,
  token: string,
  options?: { closeModal?: boolean }
) {
  const mappedUser = mapApiUserToLocal(apiUser);
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
  useAppStore.setState({
    authToken: token,
    currentUser: mappedUser,
    isAuthenticated: true,
    ...(options?.closeModal !== false ? { authModalOpen: false } : {}),
  });
  useAppStore.getState().fetchNotifications().catch(() => {});
  useAppStore.getState().fetchConversations().catch(() => {});
}

// ============ Create Store ============

export const useAppStore = create<AppState>((set, get) => ({
  // ===========================
  // Auth (local)
  // ===========================
  currentUser: null,
  isAuthenticated: false,
  authHydrated: false,
  login: (user, token) => {
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(LEGACY_TOKEN_KEY, token);
      }
      set({ currentUser: user, isAuthenticated: true, authModalOpen: false, authToken: token });
    } else {
      set({ currentUser: user, isAuthenticated: true, authModalOpen: false });
    }
    void get().fetchBookmarks();
  },
  logout: () => {
    set({
      currentUser: null,
      isAuthenticated: false,
      authToken: null,
      notifications: [],
      unreadNotificationCount: 0,
      conversations: [],
      activeConversationId: null,
      messages: [],
      currentRequest: null,
      currentSpecialist: null,
      wallet: null,
      transactions: [],
      dashboardStats: null,
      bookmarkedRequests: [],
      bookmarkedSpecialists: [],
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  },
  updateProfile: (data) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, ...data } });
    }
  },

  // ===========================
  // Auth (API)
  // ===========================
  authToken: typeof window !== 'undefined' ? (localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)) : null,
  isLoading: false,
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  initializeFromStorage: async () => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)) : null;
    if (token) {
      set({ authToken: token });
      try {
        await get().fetchCurrentUser();
        await get().fetchBookmarks();
      } catch {
        // Token is invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        set({ authToken: null, isAuthenticated: false, currentUser: null });
      }
    }
    set({ authHydrated: true });
  },

  loginWithPhone: async (phone: string, code: string, intent: 'login' | 'register' = 'login') => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, intent }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, isNewUser: false, error: data.error || 'خطا در تأیید کد' };
      }

      if (data.needsPassword) {
        return { success: true, isNewUser: true, needsPassword: true, error: null };
      }

      applyPhoneAuthSuccess(data.user, data.token);

      return { success: true, isNewUser: Boolean(data.isNewUser), error: null };
    } catch {
      return {
        success: false,
        isNewUser: false,
        error: 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
    }
  },

  loginWithPhonePassword: async (phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.error || 'خطا در ورود' };
      }

      applyPhoneAuthSuccess(data.user, data.token);
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.' };
    }
  },

  registerWithPhonePassword: async (phone: string, password: string, code: string) => {
    try {
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.error || 'خطا در ثبت‌نام' };
      }

      applyPhoneAuthSuccess(data.user, data.token, { closeModal: false });
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.' };
    }
  },

  loginAPI: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{
        user: any;
        token: string;
        message: string;
      }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const token = res.token;
      const user = res.user;

      // Store token
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
      set({ authToken: token });

      // Map API user to local User shape
      const mappedUser: User = {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        isActive: true,
        online: true,
        rating: 0,
        projectCount: 0,
        completionRate: 0,
        responseRate: 0,
        createdAt: String(user.createdAt),
      };

      set({ currentUser: mappedUser, isAuthenticated: true, authModalOpen: false });

      // Fire-and-forget background fetches
      get().fetchNotifications().catch(() => {});
      get().fetchConversations().catch(() => {});

      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ورود به حساب کاربری' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  registerAPI: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{
        user: any;
        token: string;
        message: string;
      }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const token = res.token;
      const user = res.user;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
      set({ authToken: token });

      const mappedUser: User = {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        isActive: true,
        online: true,
        rating: 0,
        projectCount: 0,
        completionRate: 0,
        responseRate: 0,
        createdAt: String(user.createdAt),
      };

      set({ currentUser: mappedUser, isAuthenticated: true, authModalOpen: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ثبت‌نام' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logoutAPI: async () => {
    const token = get().authToken;
    if (token) {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      } catch {
        // Ignore errors on logout
      }
    }
    get().logout();
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const res = await apiFetch<{ user: any }>('/api/users/me');
      const user = res.user;

      const mappedUser: User = {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        phoneVerified: Boolean(user.phoneVerified),
        username: user.username ?? undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName ?? undefined,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? undefined,
        city: user.city ?? undefined,
        province: user.province ?? undefined,
        role: user.role,
        isVerified: user.isVerified,
        isActive: true,
        online: true,
        rating: user.rating ?? 0,
        projectCount: user.projectCount ?? 0,
        completionRate: user.completionRate ?? 0,
        responseRate: user.responseRate ?? 0,
        createdAt: String(user.createdAt),
      };

      set({ currentUser: mappedUser, isAuthenticated: true });
    } catch {
      // Token is probably invalid
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      set({ authToken: null, isAuthenticated: false, currentUser: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfileAPI: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ user: any }>('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const user = res.user;
      const { currentUser } = get();
      if (currentUser) {
        set({
          currentUser: {
            ...currentUser,
            firstName: user.firstName ?? currentUser.firstName,
            lastName: user.lastName ?? currentUser.lastName,
            displayName: user.displayName ?? currentUser.displayName,
            username: user.username !== undefined ? (user.username || undefined) : currentUser.username,
            bio: user.bio ?? currentUser.bio,
            city: user.city ?? currentUser.city,
            province: user.province ?? currentUser.province,
            phone: user.phone ?? currentUser.phone,
            avatar: user.avatar ?? currentUser.avatar,
          },
        });
      }
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در بروزرسانی پروفایل' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // UI State
  // ===========================
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  authModalOpen: false,
  setAuthModalOpen: (open) =>
    set((state) => ({
      authModalOpen: open,
      authModalTab: open ? state.authModalTab : 'login',
    })),
  authModalTab: 'login',
  setAuthModalTab: (tab) => set({ authModalTab: tab }),

  voiceCallOpen: false,
  voiceCallTarget: null,
  voiceCallType: 'outgoing',
  voiceCallStatus: 'idle',
  voiceCallId: null,
  voiceCallMuted: false,
  voiceCallDuration: 0,
  openVoiceCall: (user, conversationId) => {
    void import('@/lib/voice/call-controller').then(({ startOutgoingCall }) =>
      startOutgoingCall(user, conversationId)
    );
  },
  closeVoiceCall: () => {
    void import('@/lib/voice/call-controller').then(({ hangupVoiceCall }) =>
      hangupVoiceCall()
    );
  },
  acceptVoiceCall: () => {
    void import('@/lib/voice/call-controller').then(({ acceptIncomingCall }) =>
      acceptIncomingCall()
    );
  },
  rejectVoiceCall: () => {
    void import('@/lib/voice/call-controller').then(({ rejectIncomingCall }) =>
      rejectIncomingCall()
    );
  },
  hangupVoiceCall: () => {
    void import('@/lib/voice/call-controller').then(({ hangupVoiceCall }) =>
      hangupVoiceCall()
    );
  },
  toggleVoiceCallMute: () => {
    void import('@/lib/voice/call-controller').then(({ toggleMute }) => toggleMute());
  },

  // ===========================
  // Notifications (local)
  // ===========================
  notifications: [],
  unreadNotificationCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadNotificationCount: notifications.filter((n) => !n.isRead).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadNotificationCount: state.unreadNotificationCount + 1,
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadNotificationCount: 0,
    })),

  // ===========================
  // Notifications (API)
  // ===========================
  fetchNotifications: async () => {
    try {
      const res = await apiFetch<{
        data: any[];
        unreadCount: number;
      }>('/api/notifications');

      const mapped: Notification[] = res.data.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: String(n.createdAt),
        data: n.data,
      }));

      set({
        notifications: mapped,
        unreadNotificationCount: res.unreadCount ?? mapped.filter((n) => !n.isRead).length,
      });
    } catch {
      // Silent fail for background fetch
    }
  },

  markNotificationReadAPI: async (id: string) => {
    try {
      await apiFetch('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ id }),
      });
      get().markNotificationRead(id);
    } catch {
      // Silent fail
    }
  },

  markAllNotificationsReadAPI: async () => {
    try {
      await apiFetch('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ markAll: true }),
      });
      get().markAllNotificationsRead();
    } catch {
      // Silent fail
    }
  },

  // ===========================
  // Chat (local)
  // ===========================
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  addOrUpdateConversation: (conv) => {
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conv.id);
      if (exists) {
        const otherUser =
          conv.otherUser && exists.otherUser
            ? mergeOtherUserPresence(conv.otherUser, exists.otherUser)
            : conv.otherUser ?? exists.otherUser;
        return {
          conversations: state.conversations.map((c) =>
            c.id === conv.id ? { ...c, ...conv, otherUser } : c
          ),
        };
      }
      return {
        conversations: [conv as Conversation, ...state.conversations],
      };
    });
    tryJoinConversation(conv.id);
  },
  activeConversationId: null,
  setActiveConversationId: (id) =>
    set({
      activeConversationId: id,
      peerTyping: null,
    }),

  peerTyping: null,
  typingActivityByConvId: {},

  isConversationTyping: (conversationId) => {
    const at = get().typingActivityByConvId[conversationId];
    if (!at) return false;
    return Date.now() - at < 3500;
  },

  applyPeerTypingFromSocket: (data) => {
    const me = get().currentUser?.id;
    if (!me || data.userId === me) return;

    const before = get();
    const prevConv = before.conversations.find((c) => c.id === data.conversationId);
    const hadActivity = before.typingActivityByConvId[data.conversationId] != null;

    if (!data.isTyping) {
      if (!prevConv?.isPeerTyping && !hadActivity) return;
    } else if (prevConv?.isPeerTyping && hadActivity) {
      set((state) => ({
        typingActivityByConvId: {
          ...state.typingActivityByConvId,
          [data.conversationId]: Date.now(),
        },
      }));
      return;
    }

    set((state) => {
      const typingActivityByConvId = { ...state.typingActivityByConvId };
      if (data.isTyping) {
        typingActivityByConvId[data.conversationId] = Date.now();
      } else {
        delete typingActivityByConvId[data.conversationId];
      }

      const conversations = state.conversations.map((c) =>
        c.id === data.conversationId
          ? { ...c, isPeerTyping: data.isTyping }
          : c
      );

      let peerTyping = state.peerTyping;
      if (data.conversationId === state.activeConversationId) {
        if (!data.isTyping) {
          peerTyping = null;
        } else {
          const displayName = data.user
            ? `${data.user.firstName ?? ''} ${data.user.lastName ?? ''}`.trim()
            : undefined;
          peerTyping = {
            conversationId: data.conversationId,
            userId: data.userId,
            isTyping: true,
            displayName: displayName || undefined,
            updatedAt: Date.now(),
          };
        }
      } else if (
        peerTyping?.conversationId === data.conversationId &&
        !data.isTyping
      ) {
        peerTyping = null;
      }

      return { conversations, peerTyping, typingActivityByConvId };
    });
  },
  clearPeerTyping: (conversationId) => {
    const before = get();
    const conv = before.conversations.find((c) => c.id === conversationId);
    if (!conv?.isPeerTyping && !before.typingActivityByConvId[conversationId]) {
      return;
    }
    set((state) => {
      const typingActivityByConvId = { ...state.typingActivityByConvId };
      delete typingActivityByConvId[conversationId];
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, isPeerTyping: false } : c
        ),
        peerTyping:
          state.peerTyping?.conversationId === conversationId
            ? null
            : state.peerTyping,
        typingActivityByConvId,
      };
    });
  },

  applyReadReceipt: (conversationId, readerId) => {
    const me = get().currentUser?.id;
    if (!me || readerId === me) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.conversationId === conversationId && m.senderId === me
          ? { ...m, isRead: true }
          : m
      ),
    }));
  },

  applyMessageReaction: (payload) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== payload.messageId) return m;
        const list = m.reactions ?? [];
        if (payload.eventType === 'removed') {
          return {
            ...m,
            reactions: removeReactionFromList(list, payload.userId, payload.emoji),
          };
        }
        return {
          ...m,
          reactions: upsertReactionInList(list, {
            emoji: payload.emoji,
            userId: payload.userId,
            user: payload.user,
          }),
        };
      }),
    }));
  },

  applyMessageDeleted: (payload) => {
    const me = get().currentUser?.id;
    set((state) => {
      if (payload.forEveryone) {
        return {
          messages: state.messages.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  content: MESSAGE_DELETED_TOMBSTONE,
                  deletedAt: new Date().toISOString(),
                  replyTo: undefined,
                  reactions: undefined,
                }
              : m
          ),
        };
      }
      if (payload.userId === me) {
        return {
          messages: state.messages.filter((m) => m.id !== payload.messageId),
        };
      }
      return state;
    });
  },

  applyMessageEdited: (payload) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === payload.messageId
          ? {
              ...m,
              content: payload.content,
              editedAt: payload.editedAt ?? new Date().toISOString(),
            }
          : m
      ),
    }));
  },

  applyMessagePinChanged: (payload) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.conversationId !== payload.conversationId) return m;
        if (m.id === payload.messageId) {
          return {
            ...m,
            isPinned: payload.isPinned,
            pinnedBy: payload.pinnedBy ?? undefined,
            pinnedAt: payload.pinnedAt ?? undefined,
          };
        }
        if (payload.isPinned && m.isPinned) {
          return { ...m, isPinned: false, pinnedBy: undefined, pinnedAt: undefined };
        }
        return m;
      }),
    }));
  },

  reactToMessage: async (messageId, emoji) => {
    if (!isAllowedReactionEmoji(emoji)) return false;
    const me = get().currentUser?.id;
    if (!me) return false;

    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg || msg.deletedAt) return false;

    const list = msg.reactions ?? [];
    const hadSame = list.some((r) => r.userId === me && r.emoji === emoji);
    const optimisticType = hadSame ? 'removed' : list.some((r) => r.userId === me) ? 'updated' : 'added';
    get().applyMessageReaction({
      messageId,
      conversationId: msg.conversationId,
      userId: me,
      emoji,
      eventType: optimisticType,
      user: get().currentUser
        ? {
            id: get().currentUser!.id,
            firstName: get().currentUser!.firstName,
            lastName: get().currentUser!.lastName,
            avatar: get().currentUser!.avatar,
          }
        : undefined,
    });

    if (tryReactToMessage(messageId, emoji)) return true;

    try {
      const res = await apiFetch<{ reactions: Message['reactions'] }>(
        `/api/chat/messages/${messageId}/react`,
        { method: 'POST', body: JSON.stringify({ emoji }) }
      );
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, reactions: res.reactions } : m
        ),
      }));
      return true;
    } catch {
      await get().fetchConversationMessages(msg.conversationId);
      return false;
    }
  },

  deleteChatMessage: async (messageId, forEveryone) => {
    const me = get().currentUser?.id;
    if (!me) return false;
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg) return false;

    try {
      await apiFetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        body: { forEveryone },
      });
      get().applyMessageDeleted({
        messageId,
        conversationId: msg.conversationId,
        forEveryone,
        userId: forEveryone ? undefined : me,
      });
      tryDeleteMessage(messageId, forEveryone);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      return false;
    }
  },

  editChatMessage: async (messageId, content) => {
    const me = get().currentUser?.id;
    if (!me) return false;
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg || !canEditChatMessage(msg, me)) return false;

    const trimmed = content.trim();
    if (!trimmed) return false;

    const editedAt = new Date().toISOString();
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: trimmed, editedAt } : m
      ),
    }));

    if (tryEditMessage(messageId, trimmed)) return true;

    try {
      await apiFetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: trimmed }),
      });
      return true;
    } catch {
      await get().fetchConversationMessages(msg.conversationId);
      return false;
    }
  },

  pinChatMessage: async (messageId, conversationId, unpin) => {
    const me = get().currentUser?.id;
    if (!me) return false;
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg || msg.deletedAt) return false;

    try {
      const res = await apiFetch<{
        ok: boolean;
        isPinned: boolean;
        pinnedBy: string | null;
        pinnedAt: string | null;
      }>(`/api/chat/messages/${messageId}`, {
        method: 'POST',
        body: { pin: true, unpin },
      });
      get().applyMessagePinChanged({
        messageId,
        conversationId,
        isPinned: res.isPinned,
        pinnedBy: res.pinnedBy,
        pinnedAt: res.pinnedAt,
      });
      tryPinMessage(messageId, conversationId, unpin);
      return true;
    } catch {
      await get().fetchConversationMessages(conversationId);
      return false;
    }
  },

  // ===========================
  // Chat (API)
  // ===========================
  messages: [],

  fetchConversations: async () => {
    try {
      const res = await apiFetch<{ conversations: any[] }>('/api/chat');
      let mapped: Conversation[] = [];
      set((state) => {
        const now = Date.now();
        mapped = res.conversations.map((c: any) => {
          const typingAt = state.typingActivityByConvId[c.id];
          const isTyping =
            typingAt != null && now - typingAt < 3500;
          const prev = state.conversations.find((p) => p.id === c.id);
          const otherUser = prev?.otherUser
            ? mergeOtherUserPresence(c.otherUser, prev.otherUser)
            : c.otherUser;
          return {
            id: c.id,
            requestId: c.requestId,
            contactPointId: c.contactPointId,
            businessProfileId: c.businessProfileId,
            otherUser,
            lastMessage: c.lastMessage,
            lastMessageAt: c.lastMessageAt ? String(c.lastMessageAt) : undefined,
            unreadCount: c.unreadCount ?? 0,
            businessContext: c.businessContext,
            isPeerTyping: isTyping,
            isPlatformBot: Boolean(c.isPlatformBot),
          };
        });
        return { conversations: mapped, error: null };
      });
      tryJoinConversations(mapped.map((c) => c.id));
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'بارگذاری گفتگوها ناموفق بود';
      set({ error: message });
    }
  },

  fetchConversationMessages: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch<{
        data: any[];
        pagination: any;
        conversation?: Parameters<typeof mapApiConversationItem>[0];
      }>(`/api/chat/${id}`);
      if (res.conversation) {
        get().addOrUpdateConversation(mapApiConversationItem(res.conversation));
      }
      const mapped: Message[] = res.data.map((m: any) => ({
        id: m.id,
        conversationId: id,
        senderId: m.senderId,
        content: m.content,
        type: m.type ?? 'TEXT',
        attachmentUrls: m.attachmentUrls ?? [],
        isRead: m.isRead,
        createdAt: String(m.createdAt),
        clientTempId: m.clientTempId ?? undefined,
        replyToId: m.replyToId,
        replyTo: m.replyTo,
        reactions: m.reactions,
        deletedAt: m.deletedAt ?? null,
        editedAt: m.editedAt ?? null,
        isPinned: m.isPinned ?? false,
        pinnedBy: m.pinnedBy ?? undefined,
        pinnedAt: m.pinnedAt ?? undefined,
      }));
      set((state) => {
        const apiByClientTemp = new Set(
          mapped.map((m) => m.clientTempId).filter(Boolean) as string[]
        );
        const byId = new Map<string, Message>();
        for (const m of mapped) byId.set(m.id, m);
        for (const m of state.messages) {
          if (m.conversationId !== id) continue;
          if (byId.has(m.id)) continue;
          if (m.clientTempId && apiByClientTemp.has(m.clientTempId)) continue;
          byId.set(m.id, m);
        }
        const forConv = [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const otherConv = state.messages.filter((m) => m.conversationId !== id);
        return { messages: [...otherConv, ...forConv] };
      });
      return mapped;
    } catch {
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    type = 'TEXT',
    options?: { replyToId?: string }
  ) => {
    const clientTempId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;
    const userId = get().currentUser?.id;
    if (!userId) return false;

    const replySource = options?.replyToId
      ? get().messages.find((m) => m.id === options.replyToId)
      : undefined;
    const peer = get().conversations.find((c) => c.id === conversationId)?.otherUser;
    const replyTo = replySource
      ? buildReplyToQuote(replySource, userId, peer)
      : undefined;

    const optimistic: Message = {
      id: clientTempId,
      clientTempId,
      conversationId,
      senderId: userId,
      content,
      type: type as Message['type'],
      attachmentUrls: [],
      isRead: false,
      createdAt: new Date().toISOString(),
      replyToId: options?.replyToId,
      replyTo,
    };

    set((state) => ({ messages: [...state.messages, optimistic] }));

    try {
      const res = await apiFetch<{ message: string; messageData: any }>(`/api/chat/${conversationId}`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          type,
          clientTempId,
          replyToId: options?.replyToId,
        }),
      });

      const msg = res.messageData;
      const newMessage: Message = {
        id: msg.id,
        conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type ?? 'TEXT',
        attachmentUrls: msg.attachmentUrls ?? [],
        isRead: msg.isRead,
        createdAt: String(msg.createdAt),
        clientTempId,
        replyToId: msg.replyToId,
        replyTo: msg.replyTo,
        reactions: msg.reactions,
        deletedAt: msg.deletedAt ?? null,
      };

      set((state) => ({
        messages: state.messages
          .filter((m) => m.clientTempId !== clientTempId && m.id !== msg.id)
          .concat(newMessage),
      }));

      // Update conversation's last message
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: chatMessageListPreview(msg.content, msg.type),
                lastMessageAt: String(msg.createdAt),
              }
            : c
        ),
      }));

      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'خطا در ارسال پیام';
      set((state) => ({
        error: message,
        messages: state.messages.filter((m) => m.clientTempId !== clientTempId),
      }));
      return false;
    }
  },

  sendPlatformAgentMessage: async (conversationId, content, options) => {
    const clientTempId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;
    const userId = get().currentUser?.id;
    const token = get().authToken;
    if (!userId || !token) return { ok: false, code: 'UNAUTHORIZED' };

    const conv = get().conversations.find((c) => c.id === conversationId);
    const botUserId = options?.platformBotUserId ?? conv?.otherUser?.id;
    if (!botUserId) return { ok: false, code: 'NO_BOT' };

    const replySource = options?.replyToId
      ? get().messages.find((m) => m.id === options.replyToId)
      : undefined;
    const replyTo = replySource
      ? buildReplyToQuote(replySource, userId, conv?.otherUser)
      : undefined;

    const agentStreamId = `agent-stream-${clientTempId}`;
    const now = new Date().toISOString();

    const optimisticUser: Message = {
      id: clientTempId,
      clientTempId,
      conversationId,
      senderId: userId,
      content,
      type: 'TEXT',
      attachmentUrls: [],
      isRead: false,
      createdAt: now,
      replyToId: options?.replyToId,
      replyTo,
    };

    const streamingAssistant: Message = {
      id: agentStreamId,
      conversationId,
      senderId: botUserId,
      content: '',
      type: 'TEXT',
      attachmentUrls: [],
      isRead: false,
      createdAt: now,
    };

    set((state) => ({
      messages: [...state.messages, optimisticUser, streamingAssistant],
    }));

    const streamState: { error: { code: string; message: string } | null } = { error: null };
    let finalAssistant: Message | null = null;
    let finalUserId = clientTempId;

    try {
      await streamAiAgentChat({
        conversationId,
        content,
        clientTempId,
        replyToId: options?.replyToId,
        authToken: token,
        onEvent: (event) => {
          if (event.type === 'token' && typeof event.data.delta === 'string') {
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === agentStreamId
                  ? { ...m, content: m.content + event.data.delta }
                  : m
              ),
            }));
          } else if (event.type === 'done') {
            finalAssistant = {
              id: String(event.data.messageId),
              conversationId,
              senderId: botUserId,
              content: String(event.data.content ?? ''),
              type: 'TEXT',
              attachmentUrls: [],
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            finalUserId = String(event.data.userMessageId ?? clientTempId);
          } else if (event.type === 'error') {
            streamState.error = {
              code: String(event.data.code ?? 'AGENT_ERROR'),
              message: String(event.data.message ?? 'خطا در دستیار هوشمند'),
            };
          }
        },
      });

      if (streamState.error) {
        set((state) => ({
          messages: state.messages.filter(
            (m) => m.id !== agentStreamId && m.clientTempId !== clientTempId
          ),
          error: streamState.error!.message,
        }));
        return { ok: false, code: streamState.error.code };
      }

      if (finalAssistant) {
        const replyKey = `agent-reply:${clientTempId}`;
        set((state) => ({
          messages: state.messages
            .filter(
              (m) =>
                m.id !== agentStreamId &&
                m.id !== finalAssistant!.id &&
                m.clientTempId !== replyKey,
            )
            .map((m) =>
              m.clientTempId === clientTempId ? { ...m, id: finalUserId } : m,
            )
            .concat(finalAssistant!),
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: chatMessageListPreview(finalAssistant!.content, 'TEXT'),
                  lastMessageAt: finalAssistant!.createdAt,
                }
              : c
          ),
        }));
        return { ok: true };
      }

      set((state) => ({
        messages: state.messages.filter((m) => m.id !== agentStreamId),
        error: 'پاسخ دستیار هوشمند دریافت نشد. لطفاً دوباره تلاش کنید.',
      }));
      return { ok: false, code: 'NO_RESPONSE' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در دستیار هوشمند';
      set((state) => ({
        messages: state.messages.filter(
          (m) => m.id !== agentStreamId && m.clientTempId !== clientTempId
        ),
        error: message,
      }));
      return { ok: false, code: 'AGENT_ERROR' };
    }
  },

  // ===========================
  // Bookmarks
  // ===========================
  bookmarkedRequests: [],
  bookmarkedSpecialists: [],
  setBookmarkIds: (requestIds, specialistIds) =>
    set({ bookmarkedRequests: requestIds, bookmarkedSpecialists: specialistIds }),
  applyBookmarkToggle: (type, id, isBookmarked) =>
    set((state) => {
      if (type === 'request') {
        const exists = state.bookmarkedRequests.includes(id);
        if (isBookmarked && !exists) {
          return { bookmarkedRequests: [...state.bookmarkedRequests, id] };
        }
        if (!isBookmarked && exists) {
          return {
            bookmarkedRequests: state.bookmarkedRequests.filter((rId) => rId !== id),
          };
        }
        return state;
      }
      const exists = state.bookmarkedSpecialists.includes(id);
      if (isBookmarked && !exists) {
        return { bookmarkedSpecialists: [...state.bookmarkedSpecialists, id] };
      }
      if (!isBookmarked && exists) {
        return {
          bookmarkedSpecialists: state.bookmarkedSpecialists.filter((sId) => sId !== id),
        };
      }
      return state;
    }),
  fetchBookmarks: async () => {
    const token = get().authToken;
    if (!token) return;
    try {
      const res = await apiFetch<{
        bookmarkedRequests: { id: string }[];
        bookmarkedSpecialists: { id: string }[];
      }>('/api/bookmarks');
      set({
        bookmarkedRequests: (res.bookmarkedRequests ?? []).map((r) => r.id),
        bookmarkedSpecialists: (res.bookmarkedSpecialists ?? []).map((s) => s.id),
      });
    } catch {
      // ignore — user may be logged out
    }
  },
  toggleBookmarkRequest: (id) =>
    set((state) => ({
      bookmarkedRequests: state.bookmarkedRequests.includes(id)
        ? state.bookmarkedRequests.filter((rId) => rId !== id)
        : [...state.bookmarkedRequests, id],
    })),
  toggleBookmarkSpecialist: (id) =>
    set((state) => ({
      bookmarkedSpecialists: state.bookmarkedSpecialists.includes(id)
        ? state.bookmarkedSpecialists.filter((sId) => sId !== id)
        : [...state.bookmarkedSpecialists, id],
    })),
  isRequestBookmarked: (id) => get().bookmarkedRequests.includes(id),
  isSpecialistBookmarked: (id) => get().bookmarkedSpecialists.includes(id),

  // ===========================
  // Compare
  // ===========================
  compareSpecialistIds: [],
  toggleCompareSpecialist: (id) =>
    set((state) => {
      if (state.compareSpecialistIds.includes(id)) {
        return { compareSpecialistIds: state.compareSpecialistIds.filter((sId) => sId !== id) };
      }
      if (state.compareSpecialistIds.length >= 3) {
        return state; // max 3
      }
      return { compareSpecialistIds: [...state.compareSpecialistIds, id] };
    }),
  clearCompareList: () => set({ compareSpecialistIds: [] }),

  // ===========================
  // Requests (API)
  // ===========================
  requests: [],
  currentRequest: null,

  fetchRequests: async (params?: Record<string, string>) => {
    set({ isLoading: true, error: null });
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await apiFetch<{ data: any[] }>('/api/requests' + query);
      const mapped: ServiceRequest[] = res.data.map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        budgetMin: r.budgetMin ?? undefined,
        budgetMax: r.budgetMax ?? undefined,
        budgetType: r.budgetType,
        dealType: r.dealType ?? undefined,
        rahnAmount: r.rahnAmount ?? undefined,
        monthlyRent: r.monthlyRent ?? undefined,
        deposit: r.deposit ?? undefined,
        nightlyRent: r.nightlyRent ?? undefined,
        deliveryTime: r.deliveryTime ?? undefined,
        deliveryUnit: r.deliveryUnit,
        city: r.city ?? undefined,
        province: r.province ?? undefined,
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId ?? undefined,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug ?? r.subcategory?.slug ?? r.category?.slug ?? undefined,
        categoryIcon: r.categoryIcon ?? r.subcategory?.icon ?? r.category?.icon ?? undefined,
        priority: r.priority,
        status: r.status,
        tags: r.tags ?? [],
        viewCount: r.viewCount,
        proposalCount: r.proposalCount,
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatar: r.user.avatar ?? undefined,
          city: r.user.city ?? undefined,
          createdAt: String(r.user.createdAt),
        },
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      }));
      set({ requests: mapped });
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت لیست نیازها' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRequestDetail: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ request: any }>(`/api/requests/${id}`);
      const r = res.request;
      const mapped: ServiceRequest = {
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        budgetMin: r.budgetMin ?? undefined,
        budgetMax: r.budgetMax ?? undefined,
        budgetType: r.budgetType,
        dealType: r.dealType ?? undefined,
        rahnAmount: r.rahnAmount ?? undefined,
        monthlyRent: r.monthlyRent ?? undefined,
        deposit: r.deposit ?? undefined,
        nightlyRent: r.nightlyRent ?? undefined,
        dynamicAnswers: r.dynamicAnswers ?? undefined,
        deliveryTime: r.deliveryTime ?? undefined,
        deliveryUnit: r.deliveryUnit,
        city: r.city ?? undefined,
        province: r.province ?? undefined,
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId ?? undefined,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug ?? r.subcategory?.slug ?? r.category?.slug ?? undefined,
        categoryIcon: r.categoryIcon ?? r.subcategory?.icon ?? r.category?.icon ?? undefined,
        priority: r.priority,
        status: r.status,
        moderationStatus: r.moderationStatus,
        rejectionReason: r.rejectionReason,
        tags: r.tags ?? [],
        viewCount: r.viewCount,
        proposalCount: r.proposalCount,
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatar: r.user.avatar ?? undefined,
          city: r.user.city ?? undefined,
          createdAt: String(r.user.createdAt),
        },
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      };
      set({ currentRequest: mapped });
      return mapped;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت جزئیات نیاز' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createRequest: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ request: any }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const r = res.request;
      const mapped: ServiceRequest = {
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        budgetMin: r.budgetMin ?? undefined,
        budgetMax: r.budgetMax ?? undefined,
        budgetType: r.budgetType,
        deliveryTime: r.deliveryTime ?? undefined,
        deliveryUnit: r.deliveryUnit,
        city: r.city ?? undefined,
        province: r.province ?? undefined,
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId ?? undefined,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug ?? r.subcategory?.slug ?? r.category?.slug ?? undefined,
        categoryIcon: r.categoryIcon ?? r.subcategory?.icon ?? r.category?.icon ?? undefined,
        priority: r.priority,
        status: r.status,
        tags: r.tags ?? [],
        viewCount: r.viewCount,
        proposalCount: r.proposalCount,
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatar: r.user.avatar ?? undefined,
          city: r.user.city ?? undefined,
          createdAt: String(r.user.createdAt),
        },
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      };

      // Prepend to requests list
      set((state) => ({ requests: [mapped, ...state.requests] }));
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ثبت نیاز' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // Proposals (API)
  // ===========================
  fetchProposals: async (requestId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ proposals: any[] }>(
        '/api/proposals?' + new URLSearchParams({ requestId }).toString()
      );
      return res.proposals;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت پیشنهادها' });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  submitProposal: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiFetch('/api/proposals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ارسال پیشنهاد' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProposalStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      const apiStatus =
        status === 'ACCEPTED' ? 'ACCEPT' : status === 'REJECTED' ? 'REJECT' : status;
      await apiFetch(`/api/proposals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: apiStatus }),
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در بروزرسانی وضعیت پیشنهاد' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  acceptProposal: async (proposalId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{
        proposal: { user: { id: string } };
      }>(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACCEPT' }),
      });
      return { success: true, proposerUserId: res.proposal?.user?.id };
    } catch (err: any) {
      set({ error: err.message || 'خطا در پذیرش پیشنهاد' });
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // Specialists (API)
  // ===========================
  specialists: [],
  currentSpecialist: null,

  fetchSpecialists: async (params?: Record<string, string>) => {
    set({ isLoading: true, error: null });
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await apiFetch<{ data: any[] }>('/api/specialists' + query);
      set({ specialists: res.data });
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت لیست کسب‌وکارها' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSpecialistProfile: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ specialist: any }>(`/api/specialists/${id}`);
      set({ currentSpecialist: res.specialist });
      return res.specialist;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت پروفایل کسب‌وکار' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // Categories (API)
  // ===========================
  categories: [],

  fetchCategories: async () => {
    try {
      const res = await apiFetch<{ categories: any[] }>('/api/categories');
      const mapped: Category[] = res.categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? undefined,
        icon: c.icon ?? undefined,
        image: c.image ?? undefined,
        parentId: c.parentId ?? undefined,
        children: c.children?.map((child: any) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description ?? undefined,
          icon: child.icon ?? undefined,
          image: child.image ?? undefined,
          parentId: child.parentId ?? undefined,
          requestCount: child.requestCount ?? 0,
          specialistCount: child.specialistCount ?? 0,
        })) ?? [],
        requestCount: c.requestCount ?? 0,
        specialistCount: c.specialistCount ?? 0,
      }));
      set({ categories: mapped });
      return mapped;
    } catch {
      return [];
    }
  },

  // ===========================
  // Reviews (API)
  // ===========================
  submitReview: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ثبت نظر' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // Wallet (API)
  // ===========================
  wallet: null,
  transactions: [],

  fetchWallet: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ wallet: any }>('/api/wallet');
      set({ wallet: res.wallet });
      return res.wallet;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت اطلاعات کیف پول' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{
        wallet?: { balance: number; frozen: number };
        transactions?: { data: Array<{
          id: string;
          type: string;
          amount: number;
          description?: string | null;
          status: string;
          createdAt: string;
        }> };
        data?: Array<{
          id: string;
          type: string;
          amount: number;
          description?: string | null;
          status: string;
          createdAt: string;
        }>;
      }>('/api/wallet');
      const raw = res.transactions?.data ?? res.data ?? [];
      const mapped: Transaction[] = raw.map((t) => ({
        id: t.id,
        type: t.type as Transaction['type'],
        amount: t.amount,
        description: t.description ?? undefined,
        status: t.status as Transaction['status'],
        createdAt: String(t.createdAt),
      }));
      set({ transactions: mapped });
      return mapped;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت تراکنش‌ها' });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  // ===========================
  // Dashboard (API)
  // ===========================
  dashboardStats: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch<{ stats: any }>('/api/dashboard');
      set({ dashboardStats: res.stats });
      return res.stats;
    } catch (err: any) {
      set({ error: err.message || 'خطا در دریافت آمار داشبورد' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
}));
