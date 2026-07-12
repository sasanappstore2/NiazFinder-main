import { NextRequest, NextResponse } from 'next/server';
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';
import { ExtractionCache } from '@/intake/smart-extractor/cache/extraction-cache';
import type { SmartExtractionOptions } from '@/intake/smart-extractor/types';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';

export const runtime = 'nodejs';

const cache = new ExtractionCache();

/** Max JSON body size for public smart-extract (chars ≈ bytes for Persian). */
const MAX_BODY_CHARS = 12_000;
const MAX_NEED_CHARS = 5_000;
const MAX_DETAILS_CHARS = 5_000;

export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'smart-extract', 90);
  if (rateLimited) return rateLimited;

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_CHARS) {
      return NextResponse.json(
        { error: 'بدنه درخواست بیش از حد مجاز است.' },
        { status: 413 }
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { error: 'بدنه درخواست بیش از حد مجاز است.' },
        { status: 413 }
      );
    }

    let body: {
      needText?: string;
      detailsText?: string;
      options?: SmartExtractionOptions;
    };
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      return NextResponse.json({ error: 'JSON نامعتبر' }, { status: 400 });
    }

    const needText =
      typeof body.needText === 'string' ? body.needText.slice(0, MAX_NEED_CHARS) : '';
    const detailsText =
      typeof body.detailsText === 'string'
        ? body.detailsText.slice(0, MAX_DETAILS_CHARS)
        : '';
    const options = body.options ?? {};

    if (!needText.trim() && !detailsText.trim()) {
      return NextResponse.json({ error: 'needText required' }, { status: 400 });
    }

    // Public default: rules-only. Caller must explicitly opt into AI.
    const useAI = options.useAI === true;

    const cacheKey = cache.generateKey(`${needText}\n${detailsText}`, {
      preferredCity: options.preferredCity,
      preferredCitySlug: options.preferredCitySlug,
      useAI,
      realTime: options.realTime,
    });
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    const result = await extractSmartFields(needText, detailsText, {
      ...options,
      useAI,
      useRules: options.useRules !== false,
    });

    cache.set(cacheKey, result);
    return NextResponse.json({ ...result, fromCache: false });
  } catch (error) {
    console.error('Smart extraction failed:', error);
    return NextResponse.json({ error: 'Failed to extract fields' }, { status: 500 });
  }
}
