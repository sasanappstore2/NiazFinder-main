'use client';

import dynamic from 'next/dynamic';

export const BusinessMapPinPicker = dynamic(
  () =>
    import('@/components/business/map/BusinessMapPinPicker').then((m) => m.BusinessMapPinPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-sm text-muted-foreground sm:h-[320px]">
        در حال بارگذاری نقشه…
      </div>
    ),
  }
);

export const BusinessProfileLocationMap = dynamic(
  () =>
    import('@/components/business/map/BusinessProfileLocationMap').then(
      (m) => m.BusinessProfileLocationMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 animate-pulse rounded-xl border border-border/50 bg-muted/30 sm:h-60" />
    ),
  }
);
