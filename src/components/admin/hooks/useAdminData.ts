'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import type { AnalyticsData, OverviewStats } from '@/components/admin/modules/shared/types';

export function useAdminOverview() {
  const { apiFetch } = useAdmin();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ stats: OverviewStats }>('/api/super-admin/overview');
      setOverview(res.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری آمار');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  return { overview, isLoading, reload: load };
}

export function useAdminAnalytics() {
  const { apiFetch } = useAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AnalyticsData>('/api/super-admin/analytics');
      setAnalytics(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری تحلیل‌ها');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  return { analytics, isLoading, reload: load };
}

export function useAdminDashboardData() {
  const { apiFetch } = useAdmin();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, analyticsRes] = await Promise.all([
        apiFetch<{ stats: OverviewStats }>('/api/super-admin/overview'),
        apiFetch<AnalyticsData>('/api/super-admin/analytics'),
      ]);
      setOverview(overviewRes.stats);
      setAnalytics(analyticsRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری داده‌ها');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  return { overview, analytics, isLoading, reload: load };
}
