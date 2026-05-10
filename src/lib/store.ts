import { create } from 'zustand';
import type { AppView, User, Notification, Conversation } from './types';

interface AppState {
  // Navigation
  currentView: AppView;
  viewParams: Record<string, string>;
  previousView: AppView | null;
  navigateTo: (view: AppView, params?: Record<string, string>) => void;
  goBack: () => void;

  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Chat
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'home',
  viewParams: {},
  previousView: null,
  navigateTo: (view, params = {}) => {
    const { currentView } = get();
    set({
      previousView: currentView,
      currentView: view,
      viewParams: params,
      mobileMenuOpen: false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  goBack: () => {
    const { previousView } = get();
    if (previousView) {
      set({ currentView: previousView, previousView: null });
    } else {
      set({ currentView: 'home', previousView: null });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Auth
  currentUser: null,
  isAuthenticated: false,
  login: (user) => set({ currentUser: user, isAuthenticated: true, authModalOpen: false }),
  logout: () => set({ currentUser: null, isAuthenticated: false, currentView: 'home' }),
  updateProfile: (data) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, ...data } });
    }
  },

  // UI State
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  authModalOpen: false,
  setAuthModalOpen: (open) => set({ authModalOpen: open, authModalTab: 'login' }),
  authModalTab: 'login',
  setAuthModalTab: (tab) => set({ authModalTab: tab }),

  // Notifications
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

  // Chat
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}));
