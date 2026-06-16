'use client';

import type { useAnalyticsHub } from '@/components/admin/analytics/useAnalyticsHub';

export interface IntakeTelemetryData {
  events: number;
}

interface IntakeTelemetryTabProps {
  hub: ReturnType<typeof useAnalyticsHub>;
}

/** Placeholder ? intake AI telemetry removed with manual wizard. */
export function IntakeTelemetryTab({ hub }: IntakeTelemetryTabProps) {
  if (hub.isTabLoading('intake')) {
    return <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>;
  }
  return (
    <p className="text-sm text-muted-foreground">
      دادهٔ telemetry ثبت نیاز هنوز جمع‌آوری نشده؛ پس از چند جلسه `/post` اینجا نمایش داده می‌شود.
    </p>
  );
}
