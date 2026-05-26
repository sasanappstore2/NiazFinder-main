'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AdminTheme = 'dark' | 'light';

type AdminLayoutContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  toggleNavPanel: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
};

const STORAGE_THEME_KEY = 'niazfinder-admin-theme';
const STORAGE_SIDEBAR_KEY = 'niazfinder-admin-sidebar-collapsed';

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>('dark');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeState(storedTheme);
    }
    const storedSidebar = localStorage.getItem(STORAGE_SIDEBAR_KEY);
    if (storedSidebar === 'true') setSidebarCollapsedState(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_THEME_KEY, theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_SIDEBAR_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed, hydrated]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = () => {
      if (mq.matches) {
        setSidebarCollapsedState(true);
      } else {
        setSidebarCollapsedState(false);
        setMobileMenuOpen(false);
      }
    };
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next: AdminTheme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );
  const setSidebarCollapsed = useCallback((v: boolean) => setSidebarCollapsedState(v), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsedState((v) => !v), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  const toggleNavPanel = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setMobileMenuOpen((v) => !v);
    } else {
      setSidebarCollapsedState((v) => !v);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      toggleMobileMenu,
      toggleNavPanel,
      mobileMenuOpen,
      setMobileMenuOpen,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      toggleMobileMenu,
      toggleNavPanel,
      mobileMenuOpen,
    ]
  );

  return <AdminLayoutContext.Provider value={value}>{children}</AdminLayoutContext.Provider>;
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  return ctx;
}
