'use client';

import { useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { getClientAuthToken } from '@/lib/auth/client-auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authHydrated, authToken, setAuthModalOpen } = useAppStore();

  const hasToken = Boolean(authToken || getClientAuthToken());

  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated && !hasToken) {
      setAuthModalOpen(true);
    }
  }, [authHydrated, isAuthenticated, hasToken, setAuthModalOpen]);

  if (!authHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بررسی ورود...
      </div>
    );
  }

  if (!isAuthenticated && !hasToken) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="size-8 text-muted-foreground/50" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">نیاز به ورود</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          برای دسترسی به این بخش، لطفاً وارد حساب کاربری خود شوید.
        </p>
        <Button type="button" onClick={() => setAuthModalOpen(true)}>
          ورود / ثبت‌نام
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
