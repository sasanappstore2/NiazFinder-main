import { formatApiError } from '@/lib/api/format-api-error';
import { getEstateScrapeBaseUrl } from '@/lib/business/site-import/estate-scrape-client';

export type ScrapedFilingRow = {
  externalId: string;
  fileCode?: string | null;
  title: string;
  description?: string | null;
  dealType?: string | null;
  propertyKind?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  location?: string | null;
  price?: string | null;
  deposit?: string | null;
  monthlyRent?: string | null;
  area?: string | null;
  rooms?: number | null;
  floor?: number | null;
  pricePerMeter?: string | null;
  postedAt?: string | null;
  totalFloors?: number | null;
  unitsCount?: number | null;
  buildingAge?: number | null;
  documentType?: string | null;
  cabinet?: string | null;
  flooring?: string | null;
  wallCover?: string | null;
  facade?: string | null;
  orientation?: string | null;
  heating?: string | null;
  cooling?: string | null;
  exchangeable?: boolean | null;
  hasParking?: boolean | null;
  hasStorage?: boolean | null;
  hasElevator?: boolean | null;
  hasSecurityDoor?: boolean | null;
  hasTerrace?: boolean | null;
  hasBuiltInWardrobe?: boolean | null;
  detailUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
  enrichedAt?: string | null;
  sourceMeta?: Record<string, unknown> | null;
};

export type FilingFeedScrapeRequest = {
  siteKey: string;
  loginUrl?: string;
  listingsUrl: string;
  username?: string;
  password?: string;
  siteConfig?: Record<string, unknown>;
  maxItems?: number;
  withinDays?: number;
  knownExternalIds?: string[];
};

export type FilingEnrichDetailRequest = {
  siteKey: string;
  listing: ScrapedFilingRow;
  siteConfig?: Record<string, unknown>;
  loginUrl?: string;
  username?: string;
  password?: string;
};

export type FilingEnrichDetailResponse = {
  ok: boolean;
  listing?: ScrapedFilingRow;
  error?: string;
};

export type FilingFeedScrapeResponse = {
  ok: boolean;
  listings: ScrapedFilingRow[];
  pageUrl?: string;
  extractMethod?: string;
  error?: string;
};

export type FilingAiOnboardRequest = {
  siteKey: string;
  loginUrl: string;
  listingsUrl?: string;
  username: string;
  password: string;
  userCity?: string;
  siteConfig?: Record<string, unknown>;
  asyncJob?: boolean;
};

export type FilingAiOnboardJobStatus = {
  ok: boolean;
  jobId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  step?: string;
  progress?: number;
  error?: string | null;
  result?: Record<string, unknown>;
  telemetry?: Array<Record<string, unknown>>;
};

function estateScrapeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.ESTATE_SCRAPE_SECRET?.trim();
  if (secret) headers['x-estate-scrape-secret'] = secret;
  return headers;
}

async function estateScrapeFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const base = getEstateScrapeBaseUrl();
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 180_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...estateScrapeHeaders(), ...(init?.headers as Record<string, string>) },
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as T & { detail?: string; error?: string };
    if (!res.ok) {
      throw new Error(formatApiError(data, `estate-scrape ${res.status}`));
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFilingFeedScrape(
  body: FilingFeedScrapeRequest,
  options?: { timeoutMs?: number }
): Promise<FilingFeedScrapeResponse> {
  try {
    return await estateScrapeFetch<FilingFeedScrapeResponse>('/v1/filing-feed/scrape', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: options?.timeoutMs ?? 180_000,
    });
  } catch (err) {
    return {
      ok: false,
      listings: [],
      error: err instanceof Error ? err.message : 'خطا در ارتباط با estate-scrape',
    };
  }
}

export async function fetchFilingDetailEnrich(
  body: FilingEnrichDetailRequest,
  options?: { timeoutMs?: number }
): Promise<FilingEnrichDetailResponse> {
  try {
    return await estateScrapeFetch<FilingEnrichDetailResponse>('/v1/filing-feed/enrich-detail', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: options?.timeoutMs ?? 90_000,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'خطا در enrich جزئیات',
    };
  }
}

export async function fetchFilingFeedPreview(
  body: FilingFeedScrapeRequest
): Promise<FilingFeedScrapeResponse> {
  try {
    return await estateScrapeFetch<FilingFeedScrapeResponse>('/v1/filing-feed/preview', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: 120_000,
    });
  } catch (err) {
    return {
      ok: false,
      listings: [],
      error: err instanceof Error ? err.message : 'خطا در ارتباط با estate-scrape',
    };
  }
}

export async function startFilingAiOnboard(
  body: FilingAiOnboardRequest
): Promise<FilingAiOnboardJobStatus> {
  return estateScrapeFetch<FilingAiOnboardJobStatus>('/v1/filing-feed/ai-onboard', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 30_000,
  });
}

export async function getFilingAiOnboardStatus(jobId: string): Promise<FilingAiOnboardJobStatus> {
  return estateScrapeFetch<FilingAiOnboardJobStatus>(
    `/v1/filing-feed/ai-onboard/${jobId}/status`,
    { method: 'GET', timeoutMs: 15_000 }
  );
}

export async function fetchFilingAiScrape(
  body: FilingFeedScrapeRequest & { userCity?: string }
): Promise<FilingFeedScrapeResponse> {
  try {
    return await estateScrapeFetch<FilingFeedScrapeResponse>('/v1/filing-feed/ai-scrape', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: 120_000,
    });
  } catch (err) {
    return {
      ok: false,
      listings: [],
      error: err instanceof Error ? err.message : 'خطا در ارتباط با estate-scrape',
    };
  }
}
