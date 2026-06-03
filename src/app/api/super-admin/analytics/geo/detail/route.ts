import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';
import { cityLabel, provinceLabel } from '@/lib/analytics/geo-location-index';

export const runtime = 'nodejs';

function isBusinessPath(path: string | null | undefined) {
  return Boolean(path?.startsWith('/b/'));
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const params = request.nextUrl.searchParams;
    const range = parseDateRange(params);
    const province = params.get('province');
    const city = params.get('city');
    const market = params.get('market');

    const landingFilter = market === 'business'
      ? { landingPath: { startsWith: '/b/' } }
      : market === 'need'
        ? { NOT: { landingPath: { startsWith: '/b/' } } }
        : {};

    const where = {
      firstSeen: { gte: range.from, lte: range.to },
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...landingFilter,
    };

    const sessions = await db.analyticsSession.findMany({
      where,
      select: {
        sessionId: true,
        pageViewCount: true,
        visitorId: true,
        landingPath: true,
      },
    });

    const pageViews = sessions.reduce((s, x) => s + (x.pageViewCount ?? 1), 0);
    const uniqueVisitors = new Set(sessions.map((s) => s.visitorId).filter(Boolean)).size;
    const needSessions = sessions.filter((s) => !isBusinessPath(s.landingPath)).length;
    const businessSessions = sessions.filter((s) => isBusinessPath(s.landingPath)).length;

    const pageMap = new Map<string, number>();
    for (const s of sessions) {
      const p = s.landingPath ?? '/';
      pageMap.set(p, (pageMap.get(p) ?? 0) + (s.pageViewCount ?? 1));
    }
    const topPages = Array.from(pageMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const bounced = sessions.filter((s) => (s.pageViewCount ?? 1) <= 1).length;
    const bounceRate = sessions.length ? Math.round((bounced / sessions.length) * 100) : 0;

    const eventCount = await db.analyticsEvent.count({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        sessionId: { in: sessions.map((s) => s.sessionId) },
        type: { not: 'page_view' },
      },
    });
    const conversionRate = sessions.length ? Math.round((eventCount / sessions.length) * 100) : 0;

    const title = city ? cityLabel(city) : province ? provinceLabel(province) : 'ایران';

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      title,
      province,
      city,
      kpi: {
        sessions: sessions.length,
        pageViews,
        uniqueVisitors,
        bounceRate,
        conversionRate,
        needSessions,
        businessSessions,
        topPages,
      },
    });
  } catch (error) {
    console.error('Geo detail error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
