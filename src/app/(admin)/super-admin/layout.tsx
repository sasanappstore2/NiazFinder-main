'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import '@/styles/admin/nellavio-theme.css';
import '@/styles/admin/admin-typography.css';
import { AuthModal } from '@/components/auth/AuthModal';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { AdminProvider } from '@/components/admin/context/AdminContext';
import { useAppStore } from '@/lib/store';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const initializeFromStorage = useAppStore((state) => state.initializeFromStorage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeFromStorage().finally(() => setIsReady(true));
  }, [initializeFromStorage]);

  if (!isReady) {
    return (
      <div className="admin-nellavio admin-nellavio-dark relative flex min-h-screen min-h-dvh items-center justify-center" dir="rtl">
        <div className="admin-bg-mesh" aria-hidden />
        <div className="admin-shell-layer flex flex-col items-center gap-4 px-6 text-center">
          <div className="admin-sidebar-brand flex size-14 items-center justify-center rounded-2xl text-white shadow-lg">
            <div className="admin-spinner size-6 animate-spin rounded-full border-2" />
          </div>
          <div className="admin-loading-card rounded-xl px-6 py-4">
            <p className="text-sm font-medium text-(--color-primaryText)">مرکز فرماندهی نیازفایندر</p>
            <p className="mt-1 text-xs text-(--color-secondaryText)">در حال آماده‌سازی پنل سوپرادمین...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthGuard>
        <AdminProvider>{children}</AdminProvider>
      </AuthGuard>
      <AuthModal />
    </>
  );
}
