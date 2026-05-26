/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION NOTE
 * ─────────────────────────────────────────────────────────────────────────────
 * The local `apiFetch` helper below targets the old Next.js API routes.
 * New code should prefer the NestJS‑backend bridge at `@/lib/api-client.ts`
 * which routes all requests through Caddy → port 4000.
 *
 * Gradually replace each `apiFetch('/api/…')` call with the corresponding
 * function from api‑client (e.g. `authApi.login`, `requestsApi.list`, etc.)
 * while keeping the same local‑state mutations in this store.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
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

// ============ API Helper (legacy — see migration note above) ============

async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useAppStore.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(endpoint, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) } });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ============ Store Interface ============

interface AppState {
  // Auth (local)
  currentUser: User | null;
  isAuthenticated: boolean;
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
  loginWithPhone: (phone: string, code: string) => Promise<{ success: boolean; isNewUser: boolean; error: string | null }>;
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

  // Chat (API)
  messages: Message[];
  fetchConversations: () => Promise<void>;
  fetchConversationMessages: (id: string) => Promise<Message[]>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<boolean>;

  // Bookmarks
  bookmarkedRequests: string[];
  bookmarkedSpecialists: string[];
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

// ============ Create Store ============

export const useAppStore = create<AppState>((set, get) => ({
  // ===========================
  // Auth (local)
  // ===========================
  currentUser: null,
  isAuthenticated: false,
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
      } catch {
        // Token is invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        set({ authToken: null, isAuthenticated: false, currentUser: null });
      }
    }
  },

  loginWithPhone: async (phone: string, code: string) => {
    try {
      // Step 1: Request OTP (may be rate-limited if already sent recently)
      try {
        await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
      } catch {
        // Ignore OTP send errors — user may have already requested
      }

      // Step 2: Verify OTP
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, isNewUser: false, error: errorData.error || 'خطا در تأیید کد' };
      }

      const data = await res.json();
      const apiUser = data.user;
      const token = data.token;
      const isNewUser = data.isNewUser;

      // Map API user to local User shape
      const mappedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        phone: apiUser.phone ?? undefined,
        username: apiUser.username ?? undefined,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        displayName: apiUser.displayName ?? undefined,
        avatar: apiUser.avatar ?? undefined,
        bio: apiUser.bio ?? undefined,
        city: apiUser.city ?? undefined,
        province: apiUser.province ?? undefined,
        role: apiUser.role,
        isVerified: apiUser.isVerified,
        isActive: true,
        online: true,
        rating: apiUser.rating ?? 0,
        projectCount: apiUser.projectCount ?? 0,
        completionRate: apiUser.completionRate ?? 0,
        responseRate: apiUser.responseRate ?? 0,
        createdAt: typeof apiUser.createdAt === 'string' ? apiUser.createdAt : new Date(apiUser.createdAt).toISOString(),
      };

      // Store token and login
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(LEGACY_TOKEN_KEY, token);
      }
      set({ authToken: token, currentUser: mappedUser, isAuthenticated: true, authModalOpen: false });

      // Fire-and-forget background fetches
      get().fetchNotifications().catch(() => {});
      get().fetchConversations().catch(() => {});

      return { success: true, isNewUser, error: null };
    } catch {
      return { success: false, isNewUser: false, error: 'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.' };
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
      const res = await apiFetch<{ user: any }>('/api/profile', {
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
  setAuthModalOpen: (open) => set({ authModalOpen: open, authModalTab: 'login' }),
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
        return {
          conversations: state.conversations.map((c) =>
            c.id === conv.id ? { ...c, ...conv } : c
          ),
        };
      }
      return {
        conversations: [conv as Conversation, ...state.conversations],
      };
    });
  },
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // ===========================
  // Chat (API)
  // ===========================
  messages: [],

  fetchConversations: async () => {
    try {
      const res = await apiFetch<{ conversations: any[] }>('/api/chat');
      const mapped: Conversation[] = res.conversations.map((c: any) => ({
        id: c.id,
        requestId: c.requestId,
        otherUser: c.otherUser,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt ? String(c.lastMessageAt) : undefined,
        unreadCount: c.unreadCount ?? 0,
      }));
      set({ conversations: mapped });
    } catch {
      // Silent fail
    }
  },

  fetchConversationMessages: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch<{ data: any[]; pagination: any }>(`/api/chat/${id}`);
      const mapped: Message[] = res.data.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        type: m.type ?? 'TEXT',
        attachmentUrls: m.attachmentUrls ?? [],
        isRead: m.isRead,
        createdAt: String(m.createdAt),
      }));
      set({ messages: mapped });
      return mapped;
    } catch {
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, content: string, type = 'TEXT') => {
    try {
      const res = await apiFetch<{ message: string; messageData: any }>(`/api/chat/${conversationId}`, {
        method: 'POST',
        body: JSON.stringify({ content, type }),
      });

      const msg = res.messageData;
      const newMessage: Message = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type ?? 'TEXT',
        attachmentUrls: msg.attachmentUrls ?? [],
        isRead: msg.isRead,
        createdAt: String(msg.createdAt),
      };

      // Add message to local state
      set((state) => ({ messages: [...state.messages, newMessage] }));

      // Update conversation's last message
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: msg.content, lastMessageAt: String(msg.createdAt) }
            : c
        ),
      }));

      return true;
    } catch (err: any) {
      set({ error: err.message || 'خطا در ارسال پیام' });
      return false;
    }
  },

  // ===========================
  // Bookmarks
  // ===========================
  bookmarkedRequests: [],
  bookmarkedSpecialists: [],
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
      const res = await apiFetch<{ data: any[] }>('/api/wallet/transactions');
      const mapped: Transaction[] = res.data.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description ?? undefined,
        status: t.status,
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
