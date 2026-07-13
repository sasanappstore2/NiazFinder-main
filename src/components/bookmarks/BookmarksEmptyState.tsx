'use client';

import { Bookmark } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface BookmarksEmptyStateProps {
  isBusinessUser: boolean;
  onBrowse: () => void;
  filteredEmpty?: boolean;
}

export function BookmarksEmptyState({
  isBusinessUser,
  onBrowse,
  filteredEmpty = false,
}: BookmarksEmptyStateProps) {
  if (filteredEmpty) {
    return (
      <EmptyState
        icon={Bookmark}
        variant="filtered"
        title="در این فیلتر موردی یافت نشد"
        description="فیلتر دیگری انتخاب کنید یا جستجو را پاک کنید."
      />
    );
  }

  return (
    <EmptyState
      icon={Bookmark}
      title="صندوق پیگیری خالی است"
      description={
        isBusinessUser
          ? 'آگهی‌های مناسب کسب‌وکار خود را ذخیره کنید تا اینجا ببینید و با یک کلیک پیام بدهید یا پیشنهاد ثبت کنید.'
          : 'روی آیکن ذخیره در صفحه آگهی نیاز بزنید تا اینجا ببینید و بعداً سریع به آن برگردید.'
      }
      actionLabel="مرور آگهی‌های نیاز"
      onAction={onBrowse}
    />
  );
}
