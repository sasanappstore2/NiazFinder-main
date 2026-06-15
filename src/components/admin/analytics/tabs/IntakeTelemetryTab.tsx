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
    return <p className="text-sm text-muted-foreground">?? ??? ?????????</p>;
  }
  return (
    <p className="text-sm text-muted-foreground">
      ???? intake ?????? ??????? ??? ? ?????? ???? `/post` ???? ?????? MLX.
    </p>
  );
}
