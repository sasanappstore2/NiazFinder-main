import type { User } from '@/lib/types';

// کلید ذخیره‌سازی توکن در localStorage
const TOKEN_STORAGE_KEY = 'nf_auth_token';
// کلید ذخیره‌سازی اطلاعات کاربر در localStorage
const USER_STORAGE_KEY = 'nf_auth_user';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  isLoading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  setToken: (token: string) => void;
  // بررسی نقش کاربر
  isAdmin: () => boolean;
  isSpecialist: () => boolean;
  isClient: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  // بازیابی نشست از ذخیره‌سازی محلی
  restoreSession: () => void;
}

export const createAuthStore = (
  set: (fn: (state: AuthState) => Partial<AuthState>) => void,
  get: () => AuthState,
  // تابع اختیاری برای بستن مودال احراز هویت پس از ورود
  onLogin?: () => void,
): AuthState => ({
  currentUser: null,
  isAuthenticated: false,
  authToken: null,
  isLoading: true, // در حال بارگذاری اولیه

  login: (user: User, token?: string) => {
    const updates: Partial<AuthState> = {
      currentUser: user,
      isAuthenticated: true,
      isLoading: false,
    };

    if (token) {
      updates.authToken = token;
      // ذخیره توکن در localStorage برای ماندگاری نشست
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    }

    // ذخیره اطلاعات کاربر در localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }

    set(() => updates);
    // بستن مودال احراز هویت در صورت وجود
    onLogin?.();
  },

  logout: () => {
    // پاک‌سازی ذخیره‌سازی محلی
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    set({
      currentUser: null,
      isAuthenticated: false,
      authToken: null,
      isLoading: false,
    });
  },

  updateProfile: (data: Partial<User>) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...data };
    set({ currentUser: updatedUser });

    // به‌روزرسانی ذخیره‌سازی محلی
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  },

  setToken: (token: string) => {
    set({ authToken: token });
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  },

  // توابع کمکی بررسی نقش کاربر
  isAdmin: () => {
    const { currentUser } = get();
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  },

  isSpecialist: () => {
    const { currentUser } = get();
    return currentUser?.role === 'SPECIALIST';
  },

  isClient: () => {
    const { currentUser } = get();
    return currentUser?.role === 'CLIENT';
  },

  hasRole: (...roles: User['role'][]) => {
    const { currentUser } = get();
    return currentUser ? roles.includes(currentUser.role) : false;
  },

  // بازیابی نشست کاربر از ذخیره‌سازی محلی هنگام بارگذاری اولیه
  restoreSession: () => {
    if (typeof window === 'undefined') return;

    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        set({
          currentUser: user,
          isAuthenticated: true,
          authToken: storedToken,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // در صورت خطا در خواندن ذخیره‌سازی، نشست را پاک می‌کنیم
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      set({ isLoading: false });
    }
  },
});
