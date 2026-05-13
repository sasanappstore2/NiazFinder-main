export interface ModalEntry {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

export interface UIState {
  // وضعیت سایدبار
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // وضعیت منوی موبایل
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // وضعیت مودال احراز هویت
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;

  // وضعیت تم (همگام‌سازی با ThemeProvider)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // وضعیت لودینگ سراسری
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;

  // مدیریت پشته مودال‌ها - برای سیستم مسیرهای موازی
  modalStack: ModalEntry[];
  pushModal: (modal: ModalEntry) => void;
  popModal: (id: string) => void;
  clearModals: () => void;
  currentModal: () => ModalEntry | undefined;

  // وضعیت پنل جستجو سراسری
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // وضعیت drawer پشتیبانی
  supportOpen: boolean;
  setSupportOpen: (open: boolean) => void;
}

export const createUIStore = (
  set: (fn: (state: UIState) => Partial<UIState>) => void,
  get: () => UIState,
): UIState => ({
  // سایدبار
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // منوی موبایل
  mobileMenuOpen: false,
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  // مودال احراز هویت
  authModalOpen: false,
  setAuthModalOpen: (open: boolean) => set({ authModalOpen: open, authModalTab: 'login' }),
  authModalTab: 'login',
  setAuthModalTab: (tab: 'login' | 'register') => set({ authModalTab: tab }),
  openAuthModal: (tab: 'login' | 'register' = 'login') => set({ authModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ authModalOpen: false }),

  // تم
  theme: 'system',
  setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),

  // لودینگ سراسری
  globalLoading: false,
  setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),
  loadingMessage: null,
  setLoadingMessage: (message: string | null) => set({ loadingMessage: message }),

  // پشته مودال‌ها
  modalStack: [],
  pushModal: (modal: ModalEntry) => set((s) => ({ modalStack: [...s.modalStack, modal] })),
  popModal: (id: string) => set((s) => ({ modalStack: s.modalStack.filter((m) => m.id !== id) })),
  clearModals: () => set({ modalStack: [] }),
  currentModal: () => {
    const { modalStack } = get();
    return modalStack[modalStack.length - 1];
  },

  // جستجو
  searchOpen: false,
  setSearchOpen: (open: boolean) => set({ searchOpen: open }),

  // پشتیبانی
  supportOpen: false,
  setSupportOpen: (open: boolean) => set({ supportOpen: open }),
});
