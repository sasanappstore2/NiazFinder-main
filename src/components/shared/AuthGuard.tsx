'use client';

import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuthModalOpen } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, setAuthModalOpen]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="size-8 text-muted-foreground/50" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">نیاز به ورود</h2>
        <p className="text-sm text-muted-foreground">
          برای دسترسی به این بخش، لطفاً وارد حساب کاربری خود شوید.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
