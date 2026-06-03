'use client';

export function AnalyticsEmptyState({
  title = 'داده‌ای موجود نیست',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-(--color-mainBorder) p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-(--color-secondaryText)">{description}</p>}
    </div>
  );
}
