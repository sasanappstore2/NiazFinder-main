/**
 * Phase 3 — AI Matching Insights analytics.
 *
 * Pure aggregation utilities. The API route feeds raw counts (from the existing
 * matching engine + ServiceRequest table); these helpers turn them into the
 * dashboard widget shape: Matching Rate, Response Rate, Conversion Rate, Need
 * Volume, plus hot neighborhoods and trending requests.
 */

export interface MatchingInsightsInput {
  /** needs whose category/area matched this business in the period */
  matchedNeeds: number;
  /** needs the business actually responded to */
  respondedNeeds: number;
  /** responses that converted (won) */
  conversions: number;
  /** total open needs in the business's category+area (opportunity pool) */
  needVolume: number;
  /** missed = matched but not responded */
  missedOpportunities?: number;
  hotNeighborhoods?: Array<{ label: string; count: number }>;
  trendingRequests?: Array<{ label: string; count: number; deltaPct?: number }>;
}

export interface MatchingInsightsResult {
  matchingRate: number;
  responseRate: number;
  conversionRate: number;
  needVolume: number;
  missedOpportunities: number;
  hotNeighborhoods: Array<{ label: string; count: number }>;
  trendingRequests: Array<{ label: string; count: number; deltaPct?: number }>;
}

function rate(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function computeMatchingInsights(input: MatchingInsightsInput): MatchingInsightsResult {
  const missedOpportunities =
    input.missedOpportunities ?? Math.max(0, input.matchedNeeds - input.respondedNeeds);

  return {
    matchingRate: rate(input.matchedNeeds, input.needVolume),
    responseRate: rate(input.respondedNeeds, input.matchedNeeds),
    conversionRate: rate(input.conversions, input.respondedNeeds),
    needVolume: input.needVolume,
    missedOpportunities,
    hotNeighborhoods: (input.hotNeighborhoods ?? []).slice(0, 8),
    trendingRequests: (input.trendingRequests ?? []).slice(0, 8),
  };
}

export const MATCHING_INSIGHT_LABELS = {
  matchingRate: 'نرخ تطابق',
  responseRate: 'نرخ پاسخ',
  conversionRate: 'نرخ تبدیل',
  needVolume: 'حجم نیازها',
} as const;
