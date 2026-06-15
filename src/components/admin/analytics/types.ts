export type AnalyticsDatePreset = 'today' | '7d' | '28d' | '90d' | 'custom';

export type AnalyticsMarketFilter = 'all' | 'need' | 'business';

export type AnalyticsTabId =
  | 'executive'
  | 'realtime'
  | 'engagement'
  | 'acquisition'
  | 'geo'
  | 'technology'
  | 'business'
  | 'conversions'
  | 'funnels'
  | 'intake'
  | 'retention'
  | 'platform';

export type CountRow = { key: string; label: string; value: number };

export type SummaryKpis = {
  sessions: number;
  pageViews: number;
  uniqueVisitors: number;
  events: number;
  bounceRate: number;
  avgDurationMs: number;
  avgPagesPerSession: number;
  newVsReturning: { new: number; returning: number };
  conversionRate: number;
};

export type SummaryResponse = {
  kpis: SummaryKpis;
  compare?: Record<string, number | null>;
  range: { from: string; to: string; preset: string };
};

export type SparklinesResponse = {
  series: Record<string, Array<{ date: string; label: string; value: number }>>;
};

export type RealtimeResponse = {
  activeUsers: number;
  activeUsers5m: number;
  pageViews: number;
  topPages: CountRow[];
  topCities: CountRow[];
  minuteBuckets: Array<{ label: string; value: number }>;
  marketSplit: { need: number; business: number; other: number };
  eventStream: Array<{ at: string; type: string; name: string | null; path: string; title: string | null }>;
  generatedAt: string;
};

export type TimelinePoint = { date?: string; label: string; value: number };

export type EngagementResponse = {
  entrances: CountRow[];
  exits: CountRow[];
  durationHistogram: CountRow[];
  pageKind: CountRow[];
  avgDurationMs: number;
  totalPageViews: number;
};

export type AcquisitionMatrixResponse = {
  rows: string[];
  cols: string[];
  cells: Array<{ row: string; col: string; value: number }>;
};

export type FunnelResponse = {
  preset: string;
  steps: Array<{ name: string; count: number; rate: number; stepIndex: number; dropoff: number }>;
  totalSessions: number;
};

export type RetentionResponse = {
  weeks: number;
  rows: Array<{ cohort: string; label: string; size: number; cells: number[] }>;
};

export type PlatformCorrelationResponse = {
  points: Array<{ date: string; label: string; users: number; requests: number; messages: number }>;
  correlations: Array<{ x: string; y: string; r: number }>;
};

export type AnalyticsData = import('@/components/admin/modules/shared/types').AnalyticsData;

export type PlatformAnalyticsData = AnalyticsData & {
  communications: {
    totalMessages: number;
    unreadMessages: number;
    totalNotifications: number;
    unreadNotifications: number;
  };
};
