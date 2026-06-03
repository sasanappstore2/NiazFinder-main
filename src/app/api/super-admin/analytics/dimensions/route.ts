import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';
import type { PageDimensions } from '@/lib/analytics/parse-page-context';
import { resolveDimensionLabel } from '@/lib/analytics/dimension-labels';
import {
  hasRollupCoverage,
  queryRollupDimensions,
  splitRollupRange,
} from '@/lib/analytics/query-rollup';

export const runtime = 'nodejs';

const DIM_KEYS: Record<string, keyof PageDimensions> = {
  market: 'market',
  city: 'citySlug',
  needCategory: 'needCategory',
  occupation: 'occupation',
  onlineStore: 'onlineStore',
  pageKind: 'pageKind',
};

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const dim = request.nextUrl.searchParams.get('dim') ?? 'market';
    const jsonKey = DIM_KEYS[dim] ?? 'market';
    const market = request.nextUrl.searchParams.get('market');

    const split = splitRollupRange(range.from, range.to);
    const rollupKey = jsonKey === 'citySlug' ? 'citySlug' : jsonKey;
    let rows: Array<{ key: string; label: string; value: number }> = [];
    let source: 'rollup' | 'raw' | 'hybrid' = 'raw';
    let total = 0;

    if (split && (await hasRollupCoverage(split.rollupFrom, split.rollupTo))) {
      source = split.rawFrom ? 'hybrid' : 'rollup';
      const rollupRows = await queryRollupDimensions(split.rollupFrom, split.rollupTo, rollupKey);
      const map = new Map<string, number>();
      for (const r of rollupRows) map.set(r.key, r.value);

      if (split.rawFrom && split.rawTo) {
        const events = await db.analyticsEvent.findMany({
          where: { type: 'page_view', createdAt: { gte: split.rawFrom, lte: split.rawTo } },
          select: { dimensions: true },
        });
        for (const e of events) {
          const d = (e.dimensions ?? {}) as PageDimensions;
          const val = d[jsonKey];
          const key = val ? String(val) : '(not set)';
          map.set(key, (map.get(key) ?? 0) + 1);
        }
        total += events.length;
      }

      rows = Array.from(map.entries())
        .map(([key, value]) => ({
          key,
          label: resolveDimensionLabel(dim, key),
          value,
        }))
        .sort((a, b) => b.value - a.value);
      total += rollupRows.reduce((s, r) => s + r.value, 0);
    } else {
      const events = await db.analyticsEvent.findMany({
        where: { type: 'page_view', createdAt: { gte: range.from, lte: range.to } },
        select: { dimensions: true },
      });
      total = events.length;
      rows = groupByField(events, (e) => {
        const d = (e.dimensions ?? {}) as PageDimensions;
        const val = d[jsonKey];
        return val ? String(val) : '(not set)';
      }, (key) => resolveDimensionLabel(dim, key));
    }

    if (market && market !== 'all') {
      rows = rows.filter((r) => r.key === market || dim === 'market');
    }

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      dim,
      source,
      rows: rows.slice(0, 50),
      total,
    });
  } catch (error) {
    console.error('Analytics dimensions error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
