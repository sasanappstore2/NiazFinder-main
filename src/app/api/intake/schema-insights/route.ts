import { NextRequest, NextResponse } from 'next/server';
import { getSchemaInsights } from '@/intake/intelligence/schemaInsightsService';
import type { SchemaInsights } from '@/intake/intelligence/types';

export const runtime = 'nodejs';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expiresAt: number;
  data: SchemaInsights;
}

const cache = new Map<string, CacheEntry>();

export function isPostIntakeSchemaInsightsEnabled(): boolean {
  const raw = process.env.POST_INTAKE_SCHEMA_INSIGHTS_ENABLED;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

function cacheKey(templateId: string, categorySlug: string | null, sinceDays: number): string {
  return `${templateId}|${categorySlug ?? ''}|${sinceDays}`;
}

/** Read-only schema intelligence API (v1). Future: move behind super-admin auth. */
export async function GET(request: NextRequest) {
  if (!isPostIntakeSchemaInsightsEnabled()) {
    return NextResponse.json({ error: 'schema_insights_disabled' }, { status: 404 });
  }

  const templateId = request.nextUrl.searchParams.get('templateId')?.trim();
  if (!templateId) {
    return NextResponse.json({ error: 'templateId_required' }, { status: 400 });
  }

  const categorySlug = request.nextUrl.searchParams.get('categorySlug')?.trim() || null;
  const sinceDaysRaw = request.nextUrl.searchParams.get('sinceDays');
  const sinceDays = sinceDaysRaw ? Number(sinceDaysRaw) : 7;
  const since = Number.isFinite(sinceDays) && sinceDays > 0 ? sinceDays : 7;

  const key = cacheKey(templateId, categorySlug, since);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return NextResponse.json(hit.data);
  }

  try {
    const insights = await getSchemaInsights(templateId, {
      categorySlug,
      sinceDays: since,
    });
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, data: insights });
    return NextResponse.json(insights);
  } catch (error) {
    console.warn('[schema-insights] analysis failed:', error);
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}

/** Test-only cache reset. */
export function clearSchemaInsightsCache(): void {
  cache.clear();
}
