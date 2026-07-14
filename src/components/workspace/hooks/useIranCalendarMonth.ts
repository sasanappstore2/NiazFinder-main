'use client';

import { useEffect, useState } from 'react';
import {
  emptyDayInfo,
  jalaaliDayKey,
  type IranCalendarDayInfo,
  type IranCalendarMonthPayload,
} from '@/lib/calendar/iran-holidays';

export function useIranCalendarMonth(jy: number, jm: number) {
  const [days, setDays] = useState<Record<string, IranCalendarDayInfo>>({});
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/calendar/iran-holidays/month?year=${jy}&month=${jm}`
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'خطا در بارگذاری تعطیلات');
        }
        const data = (await res.json()) as IranCalendarMonthPayload;
        if (cancelled) return;
        setDays(data.days ?? {});
        setSource(data.source ?? null);
      } catch (err) {
        if (!cancelled) {
          setDays({});
          setSource(null);
          setError(err instanceof Error ? err.message : 'خطا در بارگذاری تعطیلات');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jy, jm]);

  const dayInfo = (jd: number): IranCalendarDayInfo => {
    return days[jalaaliDayKey(jy, jm, jd)] ?? emptyDayInfo();
  };

  return { days, dayInfo, source, loading, error };
}
