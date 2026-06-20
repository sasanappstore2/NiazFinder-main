'use client';

import dynamic from 'next/dynamic';

export const NeedMapPinPicker = dynamic(
  () =>
    import('@/components/need-intake/NeedMapPinPicker').then((m) => m.NeedMapPinPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-sm text-muted-foreground sm:h-[320px]">
        در حال بارگذاری نقشه…
      </div>
    ),
  }
);
