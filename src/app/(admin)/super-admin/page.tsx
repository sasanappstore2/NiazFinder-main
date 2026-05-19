'use client';

import { useEffect, useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { useAppStore } from '@/lib/store';

export default function SuperAdminRoute() {
  const initializeFromStorage = useAppStore((state) => state.initializeFromStorage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeFromStorage().finally(() => setIsReady(true));
  }, [initializeFromStorage]);

  if (!isReady) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#050505] text-foreground" dir="rtl">
        <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/90 px-5 py-4 text-sm text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          در حال آماده‌سازی پنل سوپرادمین...
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthGuard>
        <SuperAdminDashboard />
      </AuthGuard>
      <AuthModal />
    </>
  );
}
