'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import type {
  AnalyticsDatePreset,
  AnalyticsMarketFilter,
  AnalyticsTabId,
  PlatformAnalyticsData,
  TrafficAnalyticsAcquisition,
  TrafficAnalyticsCorrelation,
  TrafficAnalyticsDimensions,
  TrafficAnalyticsEngagement,
  TrafficAnalyticsEvents,
  TrafficAnalyticsExplorer,
  TrafficAnalyticsFunnel,
  TrafficAnalyticsGeo,
  TrafficAnalyticsLanding,
  TrafficAnalyticsMatrix,
  TrafficAnalyticsPages,
  TrafficAnalyticsRealtime,
  TrafficAnalyticsRetention,
  TrafficAnalyticsSparklines,
  TrafficAnalyticsSummary,
  TrafficAnalyticsTechnology,
  TrafficAnalyticsTimeline,
} from '@/components/admin/modules/shared/types';

export type AnalyticsFilters = {
  preset: AnalyticsDatePreset;
  compare: boolean;
  customFrom: string | null;
  customTo: string | null;
  market: AnalyticsMarketFilter;
};

export type AnalyticsHubContext = {
  filters: AnalyticsFilters;
  activeTab: AnalyticsTabId;
  lastUpdated: Date | null;
  qs: string;
  buildQueryString: () => string;
  setActiveTab: (tab: AnalyticsTabId) => void;
  setFilters: (patch: Partial<AnalyticsFilters>) => void;
  patchFilters: (patch: Partial<AnalyticsFilters>) => void;
  getTabData: <T>(tab: AnalyticsTabId) => T | null;
  isTabLoading: (tab: AnalyticsTabId) => boolean;
  loadTab: (tab: AnalyticsTabId) => Promise<void>;
  refreshTab: (tab: AnalyticsTabId) => Promise<void>;
  refreshAll: () => Promise<void>;
  tabError: (tab: AnalyticsTabId) => string | undefined;
  fetchAcquisitionGroup: (groupBy: string) => Promise<TrafficAnalyticsAcquisition>;
  fetchGeoCity: (province: string) => Promise<TrafficAnalyticsGeo>;
  fetchGeoCitiesFull: (province: string, metric?: string) => Promise<TrafficAnalyticsGeo>;
  fetchGeoDetail: (province: string | null, city: string | null) => Promise<import('@/lib/geo/types').GeoDetailKpi>;
  fetchTimelineMetric: (metric: string) => Promise<TrafficAnalyticsTimeline>;
  searchExplorer: (q: string) => Promise<TrafficAnalyticsExplorer>;
};

export function buildQueryString(filters: AnalyticsFilters, extra?: Record<string, string>): string {
  const parts = [`preset=${filters.preset}`];
  if (filters.compare) parts.push('compare=1');
  if (filters.preset === 'custom' && filters.customFrom) parts.push(`from=${filters.customFrom}`);
  if (filters.preset === 'custom' && filters.customTo) parts.push(`to=${filters.customTo}`);
  if (filters.market !== 'all') parts.push(`market=${filters.market}`);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join('&');
}

function buildQs(filters: AnalyticsFilters): string {
  return buildQueryString(filters);
}

export function useAnalyticsHub(): AnalyticsHubContext {
  const { apiFetch } = useAdmin();
  const [filters, setFiltersState] = useState<AnalyticsFilters>({
    preset: '28d',
    compare: false,
    customFrom: null,
    customTo: null,
    market: 'all',
  });
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('executive');
  const [loadingTabs, setLoadingTabs] = useState<Set<AnalyticsTabId>>(new Set());
  const [tabData, setTabData] = useState<Partial<Record<AnalyticsTabId, unknown>>>({});
  const [tabErrors, setTabErrors] = useState<Partial<Record<AnalyticsTabId, string>>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  const qs = useMemo(() => buildQs(filters), [filters]);

  const setFilters = useCallback((patch: Partial<AnalyticsFilters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
    loadedRef.current.clear();
    setTabData({});
  }, []);

  const markLoading = useCallback((tab: AnalyticsTabId, loading: boolean) => {
    setLoadingTabs((prev) => {
      const next = new Set(prev);
      if (loading) next.add(tab);
      else next.delete(tab);
      return next;
    });
  }, []);

  const api = useCallback(
    async <T,>(path: string, params?: Record<string, string>): Promise<T> => {
      const extra = params
        ? Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&')
        : '';
      const sep = path.includes('?') ? '&' : '?';
      const url = extra ? `${path}${sep}${qs}&${extra}` : `${path}${sep}${qs}`;
      return apiFetch<T>(url);
    },
    [apiFetch, qs]
  );

  const loadTab = useCallback(
    async (tab: AnalyticsTabId) => {
      markLoading(tab, true);
      setTabErrors((e) => {
        const next = { ...e };
        delete next[tab];
        return next;
      });
      try {
        if (tab === 'executive') {
          const [summary, sparklines, platform] = await Promise.all([
            api<TrafficAnalyticsSummary>('/api/super-admin/analytics/summary'),
            api<TrafficAnalyticsSparklines>('/api/super-admin/analytics/summary/sparklines', {
              metrics: 'sessions,pageViews,uniqueVisitors,bounceRate,conversionRate',
            }),
            apiFetch<PlatformAnalyticsData>('/api/super-admin/analytics/platform'),
          ]);
          setTabData((d) => ({ ...d, executive: { summary, sparklines, platform } }));
        } else if (tab === 'realtime') {
          const realtime = await apiFetch<TrafficAnalyticsRealtime>('/api/super-admin/analytics/realtime');
          setTabData((d) => ({ ...d, realtime }));
        } else if (tab === 'acquisition') {
          const [acquisition, matrix, landing] = await Promise.all([
            api<TrafficAnalyticsAcquisition>('/api/super-admin/analytics/acquisition', { groupBy: 'channel' }),
            api<TrafficAnalyticsMatrix>('/api/super-admin/analytics/acquisition/matrix', {
              row: 'channel',
              col: 'landing',
            }),
            api<TrafficAnalyticsLanding>('/api/super-admin/analytics/acquisition/landing'),
          ]);
          setTabData((d) => ({ ...d, acquisition: { acquisition, matrix, landing } }));
        } else if (tab === 'engagement') {
          const [timeline, pages, engagement] = await Promise.all([
            api<TrafficAnalyticsTimeline>('/api/super-admin/analytics/timeline', { metric: 'pageViews' }),
            api<TrafficAnalyticsPages>('/api/super-admin/analytics/pages'),
            api<TrafficAnalyticsEngagement>('/api/super-admin/analytics/engagement'),
          ]);
          setTabData((d) => ({ ...d, engagement: { timeline, pages, engagement } }));
        } else if (tab === 'geo') {
          const [province, city] = await Promise.all([
            api<TrafficAnalyticsGeo>('/api/super-admin/analytics/geo', { level: 'province' }),
            api<TrafficAnalyticsGeo>('/api/super-admin/analytics/geo', { level: 'city' }),
          ]);
          setTabData((d) => ({ ...d, geo: { province, city } }));
        } else if (tab === 'technology') {
          const [device, browser, os] = await Promise.all([
            api<TrafficAnalyticsTechnology>('/api/super-admin/analytics/technology', { dim: 'device' }),
            api<TrafficAnalyticsTechnology>('/api/super-admin/analytics/technology', { dim: 'browser' }),
            api<TrafficAnalyticsTechnology>('/api/super-admin/analytics/technology', { dim: 'os' }),
          ]);
          setTabData((d) => ({ ...d, technology: { device, browser, os } }));
        } else if (tab === 'business') {
          const dims = ['market', 'city', 'needCategory', 'occupation', 'onlineStore', 'pageKind'] as const;
          const entries = await Promise.all(
            dims.map(async (dim) => {
              const res = await api<TrafficAnalyticsDimensions>('/api/super-admin/analytics/dimensions', { dim });
              return [dim, res] as const;
            })
          );
          setTabData((d) => ({ ...d, business: Object.fromEntries(entries) }));
        } else if (tab === 'conversions') {
          const events = await api<TrafficAnalyticsEvents>('/api/super-admin/analytics/events');
          setTabData((d) => ({ ...d, conversions: events }));
        } else if (tab === 'funnels') {
          const [need, business, chat] = await Promise.all([
            api<TrafficAnalyticsFunnel>('/api/super-admin/analytics/funnel', { preset: 'need' }),
            api<TrafficAnalyticsFunnel>('/api/super-admin/analytics/funnel', { preset: 'business' }),
            api<TrafficAnalyticsFunnel>('/api/super-admin/analytics/funnel', { preset: 'engagement' }),
          ]);
          setTabData((d) => ({ ...d, funnels: { need, business, chat } }));
        } else if (tab === 'retention') {
          const retention = await api<TrafficAnalyticsRetention>('/api/super-admin/analytics/retention', {
            weeks: '8',
          });
          setTabData((d) => ({ ...d, retention }));
        } else if (tab === 'platform') {
          const [platform, correlation] = await Promise.all([
            apiFetch<PlatformAnalyticsData>('/api/super-admin/analytics/platform'),
            api<TrafficAnalyticsCorrelation>('/api/super-admin/analytics/platform/correlation'),
          ]);
          setTabData((d) => ({ ...d, platform: { platform, correlation } }));
        }
        setLastUpdated(new Date());
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در بارگذاری';
        setTabErrors((prev) => ({ ...prev, [tab]: msg }));
      } finally {
        markLoading(tab, false);
      }
    },
    [api, apiFetch, markLoading]
  );

  const cacheKey = `${activeTab}:${qs}`;

  useEffect(() => {
    if (loadedRef.current.has(cacheKey)) return;
    loadedRef.current.add(cacheKey);
    void loadTab(activeTab);
  }, [activeTab, cacheKey, loadTab]);

  useEffect(() => {
    loadedRef.current.clear();
    setTabData({});
  }, [qs]);

  const refreshTab = useCallback(
    async (tab: AnalyticsTabId) => {
      for (const key of [...loadedRef.current]) {
        if (key.startsWith(`${tab}:`)) loadedRef.current.delete(key);
      }
      await loadTab(tab);
      loadedRef.current.add(`${tab}:${qs}`);
    },
    [loadTab, qs]
  );

  const getTabData = useCallback(
    <T,>(tab: AnalyticsTabId): T | null => (tabData[tab] as T) ?? null,
    [tabData]
  );

  const isTabLoading = useCallback((tab: AnalyticsTabId) => loadingTabs.has(tab), [loadingTabs]);

  const fetchAcquisitionGroup = useCallback(
    (groupBy: string) => api<TrafficAnalyticsAcquisition>('/api/super-admin/analytics/acquisition', { groupBy }),
    [api]
  );

  const fetchGeoCity = useCallback(
    (province: string) =>
      api<TrafficAnalyticsGeo>('/api/super-admin/analytics/geo', { level: 'city', province }),
    [api]
  );

  const fetchGeoCitiesFull = useCallback(
    async (province: string, metric = 'sessions') => {
      const res = await api<TrafficAnalyticsGeo & { rows: TrafficAnalyticsGeo['rows'] }>(
        '/api/super-admin/analytics/geo/cities',
        { province, metric }
      );
      return res;
    },
    [api]
  );

  const fetchGeoDetail = useCallback(
    async (province: string | null, city: string | null) => {
      const params: Record<string, string> = {};
      if (province) params.province = province;
      if (city) params.city = city;
      const res = await api<{ kpi: import('@/lib/geo/types').GeoDetailKpi }>(
        '/api/super-admin/analytics/geo/detail',
        params
      );
      return res.kpi;
    },
    [api]
  );

  const fetchTimelineMetric = useCallback(
    (metric: string) => api<TrafficAnalyticsTimeline>('/api/super-admin/analytics/timeline', { metric }),
    [api]
  );

  const searchExplorer = useCallback(
    (q: string) => api<TrafficAnalyticsExplorer>('/api/super-admin/analytics/explorer', { q }),
    [api]
  );

  return {
    filters,
    activeTab,
    lastUpdated,
    qs,
    buildQueryString: () => buildQueryString(filters),
    setActiveTab,
    setFilters,
    patchFilters: setFilters,
    getTabData,
    isTabLoading,
    loadTab,
    refreshTab,
    refreshAll: () => refreshTab(activeTab),
    tabError: (tab: AnalyticsTabId) => tabErrors[tab],
    fetchAcquisitionGroup,
    fetchGeoCity,
    fetchGeoCitiesFull,
    fetchGeoDetail,
    fetchTimelineMetric,
    searchExplorer,
  };
}
