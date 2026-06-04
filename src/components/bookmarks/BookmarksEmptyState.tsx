'use client';

import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-14 text-center">
        <p className="text-sm text-muted-foreground">در این فیلتر موردی یافت نشد.</p>
        <p className="mt-1 text-caption text-muted-foreground/70">
          فیلتر دیگری انتخاب کنید یا جستجو را پاک کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/60">
        <Bookmark className="size-8 text-muted-foreground/40" aria-hidden />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">صندوق پیگیری خالی است</h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
        {isBusinessUser
          ? 'آگهی‌های مناسب کسب‌وکار خود را ذخیره کنید تا اینجا ببینید و با یک کلیک پیام بدهید یا پیشنهاد ثبت کنید.'
          : 'روی آیکن ذخیره در صفحه آگهی نیاز بزنید تا اینجا ببینید و بعداً سریع به آن برگردید.'}
      </p>
      <Button type="button" onClick={onBrowse}>
        مرور آگهی‌های نیاز
      </Button>
    </div>
  );
}
