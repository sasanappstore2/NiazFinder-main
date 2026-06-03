export interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalRequests: number;
  openRequests: number;
  totalProposals: number;
  totalCategories: number;
  inactiveCategories: number;
  totalReviews: number;
  totalTransactions: number;
  locations: {
    countries: number;
    provinces: number;
    activeProvinces: number;
    cities: number;
    activeCities: number;
    neighborhoods: number;
    activeNeighborhoods: number;
  };
}

export interface AnalyticsTimelinePoint {
  key: string;
  label: string;
  users: number;
  requests: number;
  proposals: number;
  transactions: number;
  reviews: number;
  revenue: number;
}

export interface AnalyticsCountGroup {
  name: string;
  label: string;
  value: number;
  color: string;
}

export interface AnalyticsTopCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  requests: number;
  skills: number;
  children: number;
  score: number;
}

export interface AnalyticsActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  meta: string;
  createdAt: string;
  tone: string;
}

export interface AnalyticsData {
  generatedAt: string;
  timeline: AnalyticsTimelinePoint[];
  requestStatus: AnalyticsCountGroup[];
  proposalStatus: AnalyticsCountGroup[];
  userRoles: AnalyticsCountGroup[];
  transactionStatus: AnalyticsCountGroup[];
  topCategories: AnalyticsTopCategory[];
  recentActivity: AnalyticsActivity[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  requestCount: number;
  skillCount: number;
  childCount: number;
  children: AdminCategory[];
}

export interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  order: number;
}

/** Traffic analytics hub — first-party web analytics */
export type AnalyticsDatePreset = 'today' | '7d' | '28d' | '90d' | 'custom';
export type AnalyticsMarketFilter = 'all' | 'need' | 'business';
export type AnalyticsTabId =
  | 'executive'
  | 'realtime'
  | 'acquisition'
  | 'engagement'
  | 'geo'
  | 'technology'
  | 'business'
  | 'conversions'
  | 'funnels'
  | 'retention'
  | 'platform';

export interface TrafficAnalyticsCountRow {
  key: string;
  label: string;
  value: number;
  sharePct?: number;
}

export interface TrafficAnalyticsKpis {
  sessions: number;
  pageViews: number;
  uniqueVisitors: number;
  events: number;
  bounceRate: number;
  avgDurationMs: number;
  avgPagesPerSession: number;
  newVsReturning?: { new: number; returning: number };
  conversionRate?: number;
}

export interface TrafficAnalyticsSummary {
  range: { from: string; to: string; preset?: string };
  market: string;
  kpis: TrafficAnalyticsKpis;
  compare?: Record<string, number | null>;
}

export interface TrafficAnalyticsSparklines {
  range: { from: string; to: string };
  series: Record<string, Array<{ date: string; label: string; value: number }>>;
}

export interface TrafficAnalyticsRealtime {
  generatedAt: string;
  windowMinutes: number;
  activeUsers: number;
  activeUsers5m: number;
  pageViews: number;
  topPages: TrafficAnalyticsCountRow[];
  topCities: TrafficAnalyticsCountRow[];
  minuteBuckets: Array<{ label: string; value: number }>;
  marketSplit: { need: number; business: number; other: number };
  eventStream: Array<{
    at: string;
    type: string;
    name: string | null;
    path: string;
    title: string | null;
  }>;
}

export interface TrafficAnalyticsTimeline {
  range: { from: string; to: string };
  metric: string;
  source?: string;
  points: Array<{ date: string; label: string; value: number }>;
}

export interface TrafficAnalyticsPages {
  range: { from: string; to: string };
  totalPageViews: number;
  uniquePaths: number;
  rows: Array<{ path: string; title: string | null; views: number; avgDurationMs?: number }>;
}

export interface TrafficAnalyticsAcquisition {
  range: { from: string; to: string };
  groupBy: string;
  rows: TrafficAnalyticsCountRow[];
  total: number;
}

export interface TrafficAnalyticsMatrix {
  range: { from: string; to: string };
  rowDim: string;
  colDim: string;
  rows: string[];
  cols: string[];
  cells: Array<{ row: string; col: string; value: number }>;
  total: number;
}

export interface TrafficAnalyticsLanding {
  range: { from: string; to: string };
  rows: Array<{
    path: string;
    label: string;
    sessions: number;
    bounceRate: number;
    avgPages: number;
    avgDurationMs: number;
  }>;
  total: number;
}

export interface TrafficAnalyticsEngagement {
  range: { from: string; to: string };
  entrances: TrafficAnalyticsCountRow[];
  exits: TrafficAnalyticsCountRow[];
  durationHistogram: Array<{ label: string; value: number }>;
  pageKind: TrafficAnalyticsCountRow[];
  avgDurationMs: number;
  totalPageViews: number;
}

export interface TrafficAnalyticsGeo {
  range: { from: string; to: string };
  level: string;
  provinceFilter?: string | null;
  rows: TrafficAnalyticsCountRow[];
  totalSessions?: number;
  source?: string;
}

export interface TrafficAnalyticsTechnology {
  range: { from: string; to: string };
  dim: string;
  rows: TrafficAnalyticsCountRow[];
  total: number;
}

export interface TrafficAnalyticsDimensions {
  range: { from: string; to: string };
  dim: string;
  source?: string;
  rows: TrafficAnalyticsCountRow[];
  total: number;
}

export interface TrafficAnalyticsEvents {
  range: { from: string; to: string };
  total: number;
  byName: TrafficAnalyticsCountRow[];
  byPath: TrafficAnalyticsCountRow[];
  timeline: Array<{ date: string; label: string; value: number }>;
}

export interface TrafficAnalyticsFunnelStep {
  name: string;
  count: number;
  rate: number;
  stepIndex: number;
  dropoff: number;
}

export interface TrafficAnalyticsFunnel {
  range: { from: string; to: string };
  preset: string;
  steps: TrafficAnalyticsFunnelStep[];
  totalSessions: number;
}

export interface TrafficAnalyticsRetentionRow {
  cohort: string;
  label: string;
  size: number;
  cells: number[];
}

export interface TrafficAnalyticsRetention {
  range: { from: string; to: string };
  weeks: number;
  rows: TrafficAnalyticsRetentionRow[];
}

export interface TrafficAnalyticsExplorer {
  range: { from: string; to: string };
  type?: string;
  results: Array<Record<string, unknown>>;
  message?: string;
}

export interface TrafficAnalyticsCorrelation {
  points: Array<{
    key: string;
    label: string;
    pageViews: number;
    newUsers: number;
    newRequests: number;
  }>;
}

export type PlatformAnalyticsData = AnalyticsData & {
  communications: {
    totalMessages: number;
    unreadMessages: number;
    totalNotifications: number;
    unreadNotifications: number;
  };
};
