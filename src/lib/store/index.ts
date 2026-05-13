import { create } from 'zustand';
import type { AppView, User, Notification, Conversation } from '@/lib/types';
import { createNavigationStore } from './navigation-store';
import type { NavigationHistoryEntry } from './navigation-store';
import { createAuthStore } from './auth-store';
import { createUIStore } from './ui-store';
import type { ModalEntry } from './ui-store';
import { createNotificationStore } from './notification-store';
import type { NotificationPreferences } from './notification-store';
import { createChatStore } from './chat-store';
import type { CachedMessageGroup, TypingIndicator } from './chat-store';
import { createBookmarkStore } from './bookmark-store';
import { createCompareStore } from './compare-store';

/**
 * رابط یکپارچه کل فروشگاه برنامه
 * این رابط دقیقاً با رابط قدیمی useAppStore سازگار است (backward compatibility)
 * و تمام ویژگی‌های جدید فروشگاه‌های جداگانه را نیز شامل می‌شود.
 */
export interface AppStoreState {
  // ============ ناوبری (Navigation) ============
  currentView: AppView;
  viewParams: Record<string, string>;
  previousView: AppView | null;
  navigateTo: (view: AppView, params?: Record<string, string>) => void;
  goBack: () => void;
  // ویژگی‌های جدید ناوبری
  history: NavigationHistoryEntry[];
  parseHash: (hash: string) => { view: AppView; params: Record<string, string> };
  toHash: (view: AppView, params?: Record<string, string>) => string;
  clearHistory: () => void;

  // ============ احراز هویت (Auth) ============
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  // ویژگی‌های جدید احراز هویت
  authToken: string | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  isAdmin: () => boolean;
  isSpecialist: () => boolean;
  isClient: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  restoreSession: () => void;

  // ============ وضعیت رابط کاربری (UI) ============
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
  // ویژگی‌های جدید رابط کاربری
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
  modalStack: ModalEntry[];
  pushModal: (modal: ModalEntry) => void;
  popModal: (id: string) => void;
  clearModals: () => void;
  currentModal: () => ModalEntry | undefined;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  supportOpen: boolean;
  setSupportOpen: (open: boolean) => void;

  // ============ اعلان‌ها (Notifications) ============
  notifications: Notification[];
  unreadNotificationCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // ویژگی‌های جدید اعلان‌ها
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  pollingEnabled: boolean;
  pollingInterval: number;
  isPolling: boolean;
  lastPollTimestamp: number | null;
  preferences: NotificationPreferences;
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (interval: number) => void;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  resetNotificationPreferences: () => void;
  saveNotificationPreferences: () => void;
  loadNotificationPreferences: () => void;

  // ============ چت (Chat) ============
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  // ویژگی‌های جدید چت
  messageCache: Map<string, CachedMessageGroup>;
  loadingMessages: Set<string>;
  unreadCounts: Record<string, number>;
  typingIndicators: TypingIndicator[];
  onlineUsers: Set<string>;
  messageAnchor: string | null;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setMessages: (conversationId: string, messages: import('@/lib/types').Message[], hasMore?: boolean) => void;
  addMessage: (message: import('@/lib/types').Message) => void;
  updateMessage: (conversationId: string, messageId: string, data: Partial<import('@/lib/types').Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearMessageCache: (conversationId?: string) => void;
  getMessages: (conversationId: string) => import('@/lib/types').Message[];
  hasMoreMessages: (conversationId: string) => boolean;
  setLoadingMessages: (conversationId: string, loading: boolean) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  getTotalUnread: () => number;
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  isUserTyping: (conversationId: string, userId: string) => boolean;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  isUserOnline: (userId: string) => boolean;
  setMessageAnchor: (messageId: string | null) => void;

  // ============ نشان‌ها (Bookmarks) ============
  bookmarkedRequests: string[];
  bookmarkedSpecialists: string[];
  toggleBookmarkRequest: (id: string) => void;
  toggleBookmarkSpecialist: (id: string) => void;
  isRequestBookmarked: (id: string) => boolean;
  isSpecialistBookmarked: (id: string) => boolean;
  // ویژگی‌های جدید نشان‌ها
  syncBookmarksFromStorage: () => void;
  clearAllBookmarks: () => void;
  getBookmarkCount: () => number;

  // ============ مقایسه (Compare) ============
  compareSpecialistIds: string[];
  toggleCompareSpecialist: (id: string) => void;
  clearCompareList: () => void;
  // ویژگی‌های جدید مقایسه
  isInCompare: (id: string) => boolean;
  isCompareFull: () => boolean;
  getCompareCount: () => number;
  setCompareList: (ids: string[]) => void;
}

/**
 * فروشگاه اصلی برنامه - ترکیبی از تمام زیرفروشگاه‌ها
 * سازگار با رابط قبلی برای backward compatibility
 */
export const useAppStore = create<AppStoreState>((set, get) => ({
  // === ناوبری ===
  ...createNavigationStore(set, get),

  // === احراز هویت - بستن مودال پس از ورود ===
  ...createAuthStore(set, get, () => {
    // بستن مودال احراز هویت و منوی موبایل پس از ورود موفق
    get().setAuthModalOpen(false);
    get().setMobileMenuOpen(false);
  }),

  // === رابط کاربری ===
  ...createUIStore(set, get),

  // === اعلان‌ها ===
  ...createNotificationStore(set, get),

  // === چت ===
  ...createChatStore(set, get),

  // === نشان‌ها ===
  ...createBookmarkStore(set, get),

  // === مقایسه ===
  ...createCompareStore(set, get),

  // نام مستعار‌های سازگار با رابط قبلی
  updateNotificationPreferences: (prefs) => get().updatePreferences(prefs),
  resetNotificationPreferences: () => get().resetPreferences(),
  saveNotificationPreferences: () => get().savePreferences(),
  loadNotificationPreferences: () => get().loadPreferences(),
  syncBookmarksFromStorage: () => get().syncFromStorage(),
}));
