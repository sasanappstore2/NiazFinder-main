import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';
import { cityLabel, provinceLabel } from '@/lib/analytics/geo-location-index';
import {
  hasRollupCoverage,
  queryRollupGeo,
  splitRollupRange,
} from '@/lib/analytics/query-rollup';

export const runtime = 'nodejs';

type HeatmapMetric = 'sessions' | 'pageViews' | 'uniqueVisitors' | 'bounceRate' | 'conversionRate';

function marketLandingFilter(market: string | null) {
  if (!market || market === 'all') return {};
  if (market === 'business') return { landingPath: { startsWith: '/b/' } };
  return { NOT: { landingPath: { startsWith: '/b/' } } };
}

function pctDelta(current: number, previous: number): number | undefined {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const params = request.nextUrl.searchParams;
    const range = parseDateRange(params);
    const level = params.get('level') ?? 'province';
    const provinceFilter = params.get('province');
    const metric = (params.get('metric') ?? 'sessions') as HeatmapMetric;
    const market = params.get('market');

    const sessionWhere = {
      firstSeen: { gte: range.from, lte: range.to },
      ...(provinceFilter ? { province: provinceFilter } : {}),
      ...marketLandingFilter(market),
    };

    const split = splitRollupRange(range.from, range.to);
    if (metric === 'sessions' && level === 'province' && split && !provinceFilter && !market && (await hasRollupCoverage(split.rollupFrom, split.rollupTo))) {
      const rollupRows = await queryRollupGeo(split.rollupFrom, split.rollupTo, 'province');
      if (rollupRows.length > 0) {
        let compareRows: typeof rollupRows = [];
        if (range.compareFrom && range.compareTo) {
          compareRows = await queryRollupGeo(range.compareFrom, range.compareTo, 'province');
        }
        const compareMap = new Map(compareRows.map((r) => [r.key, r.value]));
        const total = rollupRows.reduce((s, r) => s + r.value, 0);
        return NextResponse.json({
          range: { from: range.from.toISOString(), to: range.to.toISOString() },
          level,
          metric,
          rows: rollupRows.map((r) => {
            const prev = compareMap.get(r.key) ?? 0;
            return {
              key: r.key,
              label: provinceLabel(r.key),
              value: r.value,
              sharePct: total ? Math.round((r.value / total) * 100) : 0,
              compareValue: range.compareFrom ? prev : undefined,
              compareDelta: range.compareFrom ? pctDelta(r.value, prev) : undefined,
            };
          }),
          source: 'rollup',
        });
      }
    }

    const sessions = await db.analyticsSession.findMany({
      where: sessionWhere,
      select: {
        sessionId: true,
        province: true,
        city: true,
        pageViewCount: true,
        visitorId: true,
        landingPath: true,
      },
    });

    let compareSessions: typeof sessions = [];
    if (range.compareFrom && range.compareTo) {
      compareSessions = await db.analyticsSession.findMany({
        where: {
          firstSeen: { gte: range.compareFrom, lte: range.compareTo },
          ...(provinceFilter ? { province: provinceFilter } : {}),
          ...marketLandingFilter(market),
        },
        select: {
          sessionId: true,
          province: true,
          city: true,
          pageViewCount: true,
          visitorId: true,
          landingPath: true,
        },
      });
    }

    const buildRows = (list: typeof sessions) => {
      if (metric === 'pageViews') {
        const byKey = new Map<string, number>();
        for (const s of list) {
          const key = level === 'city' ? s.city : s.province;
          if (!key) continue;
          byKey.set(key, (byKey.get(key) ?? 0) + (s.pageViewCount ?? 1));
        }
        return Array.from(byKey.entries()).map(([key, value]) => ({ key, value }));
      }
      if (metric === 'uniqueVisitors') {
        const byKey = new Map<string, Set<string>>();
        for (const s of list) {
          const key = level === 'city' ? s.city : s.province;
          if (!key || !s.visitorId) continue;
          if (!byKey.has(key)) byKey.set(key, new Set());
          byKey.get(key)!.add(s.visitorId);
        }
        return Array.from(byKey.entries()).map(([key, set]) => ({ key, value: set.size }));
      }
      return groupByField(
        list.filter((s) => (level === 'city' ? s.city : s.province)),
        (s) => (level === 'city' ? s.city! : s.province!)
      ).map((r) => ({ key: r.key, value: r.value }));
    };

    const current = buildRows(sessions);
    const previous = buildRows(compareSessions);
    const prevMap = new Map(previous.map((r) => [r.key, r.value]));
    const total = current.reduce((s, r) => s + r.value, 0);

    const withShare = current
      .sort((a, b) => b.value - a.value)
      .map((r) => {
        const prev = prevMap.get(r.key) ?? 0;
        const label = level === 'city' ? cityLabel(r.key) : provinceLabel(r.key);
        return {
          key: r.key,
          label,
          value: r.value,
          sharePct: total ? Math.round((r.value / total) * 100) : 0,
          compareValue: range.compareFrom ? prev : undefined,
          compareDelta: range.compareFrom ? pctDelta(r.value, prev) : undefined,
        };
      });

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      level,
      provinceFilter,
      metric,
      market: market ?? 'all',
      rows: withShare,
      totalSessions: sessions.length,
      source: 'raw',
    });
  } catch (error) {
    console.error('Analytics geo error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
