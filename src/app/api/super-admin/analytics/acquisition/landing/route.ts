import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 50);

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { landingPath: true, pageViewCount: true, totalDurationMs: true },
    });

    const landingRows = groupByField(sessions, (s) => s.landingPath ?? '/');
    const withMetrics = landingRows.slice(0, limit).map((row) => {
      const subset = sessions.filter((s) => (s.landingPath ?? '/') === row.key);
      const avgPages =
        subset.reduce((sum, s) => sum + s.pageViewCount, 0) / (subset.length || 1);
      const avgDuration =
        subset.reduce((sum, s) => sum + s.totalDurationMs, 0) / (subset.length || 1);
      const bounces = subset.filter(
        (s) => s.pageViewCount <= 1 && s.totalDurationMs <= 10_000
      ).length;
      return {
        path: row.key,
        label: row.label,
        sessions: row.value,
        bounceRate: subset.length ? Math.round((bounces / subset.length) * 100) : 0,
        avgPages: Number(avgPages.toFixed(1)),
        avgDurationMs: Math.round(avgDuration),
      };
    });

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      rows: withMetrics,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Analytics acquisition landing error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
