import type { Notification } from '@/lib/types';

// تنظیمات پیش‌فرض برای نظارت بر اعلان‌ها
const DEFAULT_POLLING_INTERVAL = 30000; // ۳۰ ثانیه
const MAX_NOTIFICATIONS = 100;

export type NotificationType = string;

export interface NotificationPreferences {
  // دریافت اعلان برای هر نوع رویداد
  newProposal: boolean;
  proposalAccepted: boolean;
  newMessage: boolean;
  projectUpdate: boolean;
  paymentReceived: boolean;
  reviewReceived: boolean;
  systemAnnouncement: boolean;
  // فعال بودن اعلان‌های فشاری مرورگر
  pushEnabled: boolean;
  // فعال بودن صدای اعلان
  soundEnabled: boolean;
  // فعال بودن اعلان ایمیل
  emailEnabled: boolean;
}

// مقادیر پیش‌فرض تنظیمات اعلان
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newProposal: true,
  proposalAccepted: true,
  newMessage: true,
  projectUpdate: true,
  paymentReceived: true,
  reviewReceived: true,
  systemAnnouncement: true,
  pushEnabled: false,
  soundEnabled: true,
  emailEnabled: true,
};

export interface NotificationState {
  // لیست اعلان‌ها
  notifications: Notification[];
  unreadNotificationCount: number;
  // تنظیمات مربوط به نظارت بلادرنگ
  pollingEnabled: boolean;
  pollingInterval: number;
  isPolling: boolean;
  lastPollTimestamp: number | null;
  // تنظیمات اعلان‌ها
  preferences: NotificationPreferences;
  // توابع مدیریت اعلان‌ها
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  // توابع مدیریت نظارت
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (interval: number) => void;
  // توابع مدیریت تنظیمات
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  resetPreferences: () => void;
  savePreferences: () => void;
  loadPreferences: () => void;
}

export const createNotificationStore = (
  set: (fn: (state: NotificationState) => Partial<NotificationState>) => void,
  get: () => NotificationState,
): NotificationState => ({
  notifications: [],
  unreadNotificationCount: 0,
  pollingEnabled: false,
  pollingInterval: DEFAULT_POLLING_INTERVAL,
  isPolling: false,
  lastPollTimestamp: null,
  preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },

  setNotifications: (notifications: Notification[]) =>
    set({
      notifications: notifications.slice(0, MAX_NOTIFICATIONS),
      unreadNotificationCount: notifications.filter((n) => !n.isRead).length,
    }),

  addNotification: (notification: Notification) =>
    set((state) => {
      // جلوگیری از اعلان‌های تکراری
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;

      const newNotifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      const newUnreadCount = notification.isRead
        ? state.unreadNotificationCount
        : state.unreadNotificationCount + 1;

      return {
        notifications: newNotifications,
        unreadNotificationCount: newUnreadCount,
      };
    }),

  removeNotification: (id: string) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadNotificationCount: notification && !notification.isRead
          ? Math.max(0, state.unreadNotificationCount - 1)
          : state.unreadNotificationCount,
      };
    }),

  markNotificationRead: (id: string) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.isRead) return state;

      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      };
    }),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadNotificationCount: 0,
    })),

  clearAllNotifications: () =>
    set({
      notifications: [],
      unreadNotificationCount: 0,
    }),

  // مدیریت نظارت بلادرنگ
  startPolling: () => set({ pollingEnabled: true, isPolling: true }),
  stopPolling: () => set({ pollingEnabled: false, isPolling: false }),
  setPollingInterval: (interval: number) => set({ pollingInterval: interval }),

  // مدیریت تنظیمات اعلان
  updatePreferences: (prefs: Partial<NotificationPreferences>) =>
    set((state) => ({
      preferences: { ...state.preferences, ...prefs },
    })),

  resetPreferences: () => {
    set({ preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES } });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nf_notification_prefs');
    }
  },

  savePreferences: () => {
    if (typeof window === 'undefined') return;
    const { preferences } = get();
    localStorage.setItem('nf_notification_prefs', JSON.stringify(preferences));
  },

  loadPreferences: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('nf_notification_prefs');
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
        set((state) => ({
          preferences: { ...state.preferences, ...parsed },
        }));
      }
    } catch {
      // در صورت خطا، تنظیمات پیش‌فرض حفظ می‌شود
    }
  },
});
