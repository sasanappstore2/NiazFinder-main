'use client';

import type { ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';

export function AdminAccessGuard({ children }: { children: ReactNode }) {
  const { me, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-(--color-secondaryText)">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">در حال بررسی دسترسی سوپرادمین...</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی سوپرادمین لازم است</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          حساب شما مجوز دسترسی به پنل مدیریت را ندارد.
        </p>
      </div>
    );
  }

  const hasAccess =
    me.isOwner ||
    me.permissions.includes('*') ||
    me.permissions.includes('superadmin:access') ||
    me.permissions.length > 0;

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی کافی ندارید</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          برای ورود به پنل سوپرادمین باید نقش کارمندی با مجوز مناسب داشته باشید.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
