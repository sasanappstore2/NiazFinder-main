import { formatApiError } from '@/lib/api/format-api-error';
import type { SiteImportBlueprintId, SiteImportPreviewResult, SiteImportSuggestion } from './types';

export type SiteImportPreviewFromScrape = Omit<SiteImportPreviewResult, 'previewToken'>;

const DEFAULT_BASE = 'http://127.0.0.1:8200';
const TIMEOUT_MS = 90_000;

export function getEstateScrapeBaseUrl(): string {
  return (process.env.ESTATE_SCRAPE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
}

function estateScrapeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.ESTATE_SCRAPE_SECRET?.trim();
  if (secret) headers['x-estate-scrape-secret'] = secret;
  return headers;
}

export async function fetchSiteImportPreview(input: {
  url: string;
  hintBlueprintId?: string | null;
  occupationSlugs?: string[];
}): Promise<SiteImportPreviewFromScrape> {
  const base = getEstateScrapeBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/v1/business-import/preview`, {
      method: 'POST',
      headers: estateScrapeHeaders(),
      body: JSON.stringify({
        url: input.url,
        hintBlueprintId: input.hintBlueprintId ?? null,
        occupationSlugs: input.occupationSlugs ?? [],
      }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as SiteImportPreviewFromScrape & {
      detail?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(formatApiError(data, `درخواست estate-scrape با کد ${res.status} شکست خورد`));
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
