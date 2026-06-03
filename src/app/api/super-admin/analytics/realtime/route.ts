import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { groupByField } from '@/lib/analytics/query-utils';
import type { PageDimensions } from '@/lib/analytics/parse-page-context';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const minutes = Number(request.nextUrl.searchParams.get('minutes') ?? 30);
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const since5m = new Date(Date.now() - 5 * 60 * 1000);

    const [activeSessions, recentEvents, recentSessions] = await Promise.all([
      db.analyticsSession.count({ where: { lastSeen: { gte: since } } }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: {
          path: true,
          title: true,
          city: true,
          province: true,
          type: true,
          name: true,
          createdAt: true,
          dimensions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.analyticsSession.findMany({
        where: { lastSeen: { gte: since } },
        select: { province: true, city: true },
      }),
    ]);

    const pageViews = recentEvents.filter((e) => e.type === 'page_view');
    const topPages = groupByField(pageViews, (e) => e.path, (p) => p).slice(0, 10);
    const topCities = groupByField(
      recentSessions.filter((s) => s.city || s.province),
      (s) => s.city ?? s.province ?? '',
      (k) => k
    ).slice(0, 10);

    const active5m = await db.analyticsSession.count({
      where: { lastSeen: { gte: since5m } },
    });

    const minuteBuckets = new Map<string, number>();
    for (let i = minutes - 1; i >= 0; i--) {
      const t = new Date(Date.now() - i * 60 * 1000);
      const key = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
      minuteBuckets.set(key, 0);
    }
    for (const e of pageViews) {
      const key = `${e.createdAt.getHours().toString().padStart(2, '0')}:${e.createdAt.getMinutes().toString().padStart(2, '0')}`;
      if (minuteBuckets.has(key)) minuteBuckets.set(key, (minuteBuckets.get(key) ?? 0) + 1);
    }

    const marketSplit = { need: 0, business: 0, other: 0 };
    for (const e of pageViews) {
      const d = (e.dimensions ?? {}) as PageDimensions;
      if (d.market === 'need') marketSplit.need += 1;
      else if (d.market === 'business') marketSplit.business += 1;
      else marketSplit.other += 1;
    }

    const eventStream = recentEvents.slice(0, 40).map((e) => ({
      at: e.createdAt.toISOString(),
      type: e.type,
      name: e.name,
      path: e.path,
      title: e.title,
    }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowMinutes: minutes,
      activeUsers: activeSessions,
      activeUsers5m: active5m,
      pageViews: pageViews.length,
      topPages,
      topCities,
      minuteBuckets: Array.from(minuteBuckets.entries()).map(([label, value]) => ({ label, value })),
      marketSplit,
      eventStream,
    });
  } catch (error) {
    console.error('Analytics realtime error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
