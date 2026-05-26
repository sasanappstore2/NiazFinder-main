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
