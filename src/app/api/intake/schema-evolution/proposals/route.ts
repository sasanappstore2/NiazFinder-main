import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { getSchemaEvolutionProposals } from '@/intake/evolution/schemaEvolutionService';
import type { SchemaEvolutionProposalsResponse } from '@/intake/evolution/proposalTypes';

export const runtime = 'nodejs';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expiresAt: number;
  data: SchemaEvolutionProposalsResponse;
}

const cache = new Map<string, CacheEntry>();

export function isPostIntakeSchemaEvolutionEnabled(): boolean {
  const raw = process.env.POST_INTAKE_SCHEMA_EVOLUTION_ENABLED;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

function cacheKey(templateId: string, categorySlug: string | null, sinceDays: number): string {
  return `${templateId}|${categorySlug ?? ''}|${sinceDays}`;
}

/** Read-only schema evolution proposals (human review only — no auto-apply). */
export async function GET(request: NextRequest) {
  if (!isPostIntakeSchemaEvolutionEnabled()) {
    return NextResponse.json({ error: 'schema_evolution_disabled' }, { status: 404 });
  }

  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(request, 'ops:intake-migration:read');
    if (!authz.ok) return authz.response;
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
    const data = await getSchemaEvolutionProposals(templateId, {
      categorySlug,
      sinceDays: since,
      refresh: true,
    });
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, data });
    return NextResponse.json(data);
  } catch (error) {
    console.warn('[schema-evolution] proposals failed:', error);
    return NextResponse.json({ error: 'proposals_failed' }, { status: 500 });
  }
}

/** Test-only cache reset. */
export function clearSchemaEvolutionCache(): void {
  cache.clear();
}
