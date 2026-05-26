import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function AdminEmptyState({
  title = 'داده‌ای یافت نشد',
  description = 'فیلترها را تغییر دهید یا داده جدید اضافه کنید.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-(--color-mainBorder) bg-(--color-primaryBg)/50 px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-(--color-navItemActiveBg) text-(--color-secondaryText)">
        <Inbox className="size-7" />
      </div>
      <h3 className="font-semibold text-(--color-primaryText)">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-(--color-secondaryText)">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AdminSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-(--color-navItemActiveBg) ${className}`} />
  );
}

export function AdminKpiSkeleton() {
  return (
    <div className="rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5">
      <AdminSkeleton className="h-3 w-24" />
      <AdminSkeleton className="mt-3 h-8 w-32" />
      <AdminSkeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      <AdminSkeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <AdminSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
