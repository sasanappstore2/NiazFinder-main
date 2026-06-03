export interface MatchedBusinessItem {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logo?: string | null;
  city?: string | null;
  province?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  matchScore: number;
  matchReasonFa: string;
  topOfferTitle?: string;
  chatEnabled?: boolean;
  hasPhone?: boolean;
}

export interface MatchedBusinessesMeta {
  source: 'rules';
  engine?: 'internal';
  candidateCount: number;
  viewerMode?: 'owner' | 'business' | 'staff';
}

export interface MatchedBusinessesResponse {
  businesses: MatchedBusinessItem[];
  meta: MatchedBusinessesMeta;
  briefSummary?: string;
}

export interface NeedMatchContext {
  id: string;
  title: string;
  description: string;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  categorySlug: string;
  categoryName: string;
  tags: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  dynamicAnswers?: Record<string, unknown>;
}
