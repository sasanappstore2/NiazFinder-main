'use client';

import { AdminEmptyState } from '@/components/admin/ui/AdminSkeleton';

export function AnalyticsEmptyState({
  title = 'داده‌ای موجود نیست',
  description = 'فیلترها را تغییر دهید یا بازه زمانی دیگری انتخاب کنید.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <AdminEmptyState
      title={title}
      description={description}
      action={action}
    />
  );
}
