import type { CrawlBlueprint, FilingFieldKey } from '@/lib/filing/ingest/crawl-blueprint';

export type PortalFamilyId = 'showmelk' | 'maskanyaban' | 'generic_iran_filing';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type LoginFormGuess = {
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  confidence: number;
};

export type ListRegionCandidate = {
  containerSelector: string;
  cardCount: number;
  score: number;
  sampleText?: string;
};

export type PaginationGuess = {
  mode: 'nextButton' | 'urlTemplate';
  selector?: string;
  confidence: number;
};

export type NavLinkGuess = {
  label: string;
  href: string;
  selector: string;
};

export type PortalListPageMap = {
  url: string;
  label?: string;
  dealType?: string | null;
  dealTypeLabel?: string;
  propertyKind?: string | null;
  score?: number;
  cardCount?: number;
  containerSelector?: string | null;
};

export type PortalTaxonomyGroup = {
  dealType: string;
  dealTypeLabel: string;
  listPages: Array<{
    url: string;
    label?: string;
    cardCount?: number;
    score?: number;
  }>;
};

export type FieldVisibilityMap = {
  visible: string[];
  hiddenUntilLogin: string[];
  neverSeen?: string[];
};

/** Full portal map from public crawl (no login). */
export type PortalSiteMap = {
  entryUrl: string;
  pagesVisited: number;
  loginRequired?: boolean;
  loginUrl?: string | null;
  listingsUrl?: string;
  categories?: Array<Record<string, unknown>>;
  listPages: PortalListPageMap[];
  navigationTree?: PortalTaxonomyGroup[];
  fieldVisibility?: FieldVisibilityMap;
  notes?: string;
  mode?: 'public_map' | 'authenticated';
};

/** Structural map of a filing portal page (from HTML or live DOM). */
export type SiteIndex = {
  portalFamily: PortalFamilyId;
  baseUrl: string;
  pageKind: 'home' | 'login' | 'list' | 'unknown';
  loginForm?: LoginFormGuess;
  listRegions: ListRegionCandidate[];
  bestListRegion?: ListRegionCandidate;
  pagination?: PaginationGuess;
  navLinks: NavLinkGuess[];
};

export type FieldExtractorGuess = {
  selector?: string;
  attr?: 'textContent' | 'innerHTML' | 'href';
  regex?: string;
  regexGroup?: number;
  transform?: 'trim' | 'digits' | 'toman' | 'persianDigits';
};

export type FieldGuess = {
  key: FilingFieldKey;
  value?: string;
  confidence: number;
  level: ConfidenceLevel;
  evidence?: string;
  extractor?: FieldExtractorGuess;
  manuallyFixed?: boolean;
};

export type DiscoveryResult = {
  siteIndex: SiteIndex;
  fieldGuesses: FieldGuess[];
  sampleCards: string[];
  blueprint: CrawlBlueprint;
  confidenceMap: Partial<Record<FilingFieldKey, number>>;
};

export const CRITICAL_FILING_FIELDS: FilingFieldKey[] = [
  'fileCode',
  'dealType',
  'neighborhood',
  'deposit',
  'price',
];

export const CONFIDENCE_THRESHOLD_HIGH = 0.75;
export const CONFIDENCE_THRESHOLD_MEDIUM = 0.5;
export const CONFIDENCE_THRESHOLD_REQUIRED = 0.6;

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLD_HIGH) return 'high';
  if (score >= CONFIDENCE_THRESHOLD_MEDIUM) return 'medium';
  return 'low';
}
