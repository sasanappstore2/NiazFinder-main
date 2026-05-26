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
      <div className="admin-nellavio admin-nellavio-dark flex min-h-screen min-h-dvh items-center justify-center" dir="rtl">
        <div className="flex items-center gap-3 rounded-lg border border-(--color-mainBorder) bg-(--color-primaryBg) px-5 py-4 text-sm text-(--color-secondaryText)">
          <div className="size-5 animate-spin rounded-full border-2 border-(--color-mainColor)/30 border-t-(--color-mainColor)" />
          در حال آماده‌سازی پنل سوپرادمین...
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
