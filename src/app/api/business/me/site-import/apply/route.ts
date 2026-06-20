import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { applySiteImportSuggestions } from '@/lib/business/site-import/apply-suggestions';
import { loadSiteImportPreview } from '@/lib/business/site-import/preview-cache';
import { sanitizeSuggestionList } from '@/lib/business/site-import/sanitize-suggestions';
import { isValidSiteImportSuggestion } from '@/lib/business/site-import/suggestion-queue';
import type { SiteImportSuggestion } from '@/lib/business/site-import/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const APPLY_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const rate = checkRateLimit(`site-import-apply:${auth.user.id}`, APPLY_PER_HOUR, WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `\u062a\u0639\u062f\u0627\u062f \u062f\u0631\u062e\u0648\u0627\u0633\u062a\u200c\u0647\u0627\u06cc \u0627\u0639\u0645\u0627\u0644 \u0632\u06cc\u0627\u062f \u0627\u0633\u062a. ${rate.retryAfterSec ?? 60} \u062b\u0627\u0646\u06cc\u0647 \u062f\u06cc\u06af\u0631 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const suggestionIds = Array.isArray(body.suggestionIds)
      ? body.suggestionIds.map(String)
      : [];
    const previewToken = typeof body.previewToken === 'string' ? body.previewToken.trim() : '';

    if (suggestionIds.length === 0) {
      return NextResponse.json({ error: '\u0647\u06cc\u0686 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u06cc \u0627\u0646\u062a\u062e\u0627\u0628 \u0646\u0634\u062f\u0647' }, { status: 400 });
    }

    let suggestions: SiteImportSuggestion[] = [];

    if (previewToken) {
      const cached = loadSiteImportPreview(previewToken, auth.user.id);
      if (!cached) {
        return NextResponse.json(
          { error: '\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u0645\u0646\u0642\u0636\u06cc \u0634\u062f\u0647\u061b \u062f\u0648\u0628\u0627\u0631\u0647 \u00ab\u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0627\u0632 \u0633\u0627\u06cc\u062a\u00bb \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f' },
          { status: 410 }
        );
      }
      suggestions = cached;
    } else if (Array.isArray(body.suggestions)) {
      const raw = body.suggestions.filter(isValidSiteImportSuggestion) as SiteImportSuggestion[];
      suggestions = sanitizeSuggestionList(raw);
    }

    if (suggestions.length === 0) {
      return NextResponse.json({ error: '\u0644\u06cc\u0633\u062a \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0647\u0627 \u062e\u0627\u0644\u06cc \u06cc\u0627 \u0646\u0627\u0645\u0639\u062a\u0628\u0631 \u0627\u0633\u062a' }, { status: 400 });
    }

    const profile = await loadMyBusinessProfile(auth.user);
    const result = await applySiteImportSuggestions(profile, suggestions, suggestionIds);

    return NextResponse.json({
      message: '\u0627\u0639\u0645\u0627\u0644 \u0634\u062f',
      ...result,
    });
  } catch (error) {
    console.error('site-import apply error:', error);
    return NextResponse.json({ error: '\u062e\u0637\u0627 \u062f\u0631 \u0627\u0639\u0645\u0627\u0644 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0647\u0627' }, { status: 500 });
  }
}
