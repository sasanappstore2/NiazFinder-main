import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateImportUrl } from '@/lib/business/site-import/validate-url';
import { fetchSiteImportPreview } from '@/lib/business/site-import/estate-scrape-client';
import type { SiteImportPreviewFromScrape } from '@/lib/business/site-import/estate-scrape-client';
import { parseJsonArray } from '@/lib/business/json-fields';
import { storeSiteImportPreview } from '@/lib/business/site-import/preview-cache';
import { sanitizeSuggestionList } from '@/lib/business/site-import/sanitize-suggestions';
import type { SiteImportBlueprintId, SiteImportPreviewResult } from '@/lib/business/site-import/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const PREVIEW_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000;

function parseOccupationSlugs(body: Record<string, unknown>, profileSlugs: string[]): string[] {
  if (Array.isArray(body.occupationSlugs)) {
    const fromBody = body.occupationSlugs
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (fromBody.length > 0) return fromBody;
  }
  return profileSlugs;
}

function normalizePreview(raw: SiteImportPreviewFromScrape): SiteImportPreviewResult {
  const blueprintId: SiteImportBlueprintId =
    raw.blueprintId === 'online_store' ? 'online_store' : 'company';
  return {
    siteType: String(raw.siteType ?? blueprintId),
    blueprintId,
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    pagesScraped: Array.isArray(raw.pagesScraped) ? raw.pagesScraped.map(String) : [],
    suggestions: sanitizeSuggestionList(Array.isArray(raw.suggestions) ? raw.suggestions : []),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
    previewToken: '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const rate = checkRateLimit(
      `site-import-preview:${auth.user.id}`,
      PREVIEW_PER_HOUR,
      WINDOW_MS
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `\u062a\u0639\u062f\u0627\u062f \u062f\u0631\u062e\u0648\u0627\u0633\u062a\u200c\u0647\u0627 \u0632\u06cc\u0627\u062f \u0627\u0633\u062a. ${rate.retryAfterSec ?? 60} \u062b\u0627\u0646\u06cc\u0647 \u062f\u06cc\u06af\u0631 \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.`,
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawUrl = String(body.url ?? '').trim();
    const validated = await validateImportUrl(rawUrl);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const profile = await loadMyBusinessProfile(auth.user);
    const profileSlugs = parseJsonArray<string>(profile.categorySlugs);
    const occupationSlugs = parseOccupationSlugs(body, profileSlugs);

    const hintBlueprintId =
      body.hintBlueprintId === 'online_store' || body.hintBlueprintId === 'company'
        ? body.hintBlueprintId
        : null;

    const rawPreview = await fetchSiteImportPreview({
      url: validated.url,
      hintBlueprintId,
      occupationSlugs,
    });

    const preview = normalizePreview(rawPreview);
    preview.previewToken = storeSiteImportPreview(auth.user.id, preview.suggestions);

    return NextResponse.json(preview);
  } catch (error) {
    console.error('site-import preview error:', error);
    const message =
      error instanceof Error ? error.message : '\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0627\u0632 \u0633\u0627\u06cc\u062a';
    if (message.includes('abort')) {
      return NextResponse.json(
        { error: '\u0632\u0645\u0627\u0646 \u0628\u0631\u0631\u0633\u06cc \u0633\u0627\u06cc\u062a \u0628\u0647 \u067e\u0627\u06cc\u0627\u0646 \u0631\u0633\u06cc\u062f\u061b \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f' },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
