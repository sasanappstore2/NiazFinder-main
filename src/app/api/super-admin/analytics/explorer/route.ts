import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    const type = request.nextUrl.searchParams.get('type') ?? 'all';

    if (!q || q.length < 2) {
      return NextResponse.json({
        range: { from: range.from.toISOString(), to: range.to.toISOString() },
        results: [],
        message: 'حداقل ۲ کاراکتر برای جستجو لازم است',
      });
    }

    const like = q.toLowerCase();

    if (type === 'visitor' || type === 'all') {
      const sessions = await db.analyticsSession.findMany({
        where: {
          firstSeen: { gte: range.from, lte: range.to },
          visitorId: { contains: q, mode: 'insensitive' },
        },
        select: {
          visitorId: true,
          sessionId: true,
          firstSeen: true,
          pageViewCount: true,
          landingPath: true,
        },
        take: 20,
      });

      if (sessions.length) {
        return NextResponse.json({
          range: { from: range.from.toISOString(), to: range.to.toISOString() },
          type: 'visitor',
          results: sessions.map((s) => ({
            id: s.visitorId,
            sessionId: s.sessionId,
            firstSeen: s.firstSeen.toISOString(),
            pageViews: s.pageViewCount,
            landingPath: s.landingPath,
          })),
        });
      }
    }

    const events = await db.analyticsEvent.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        OR: [
          { path: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        type: true,
        name: true,
        path: true,
        title: true,
        visitorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const filtered = events.filter(
      (e) =>
        e.path.toLowerCase().includes(like) ||
        (e.name?.toLowerCase().includes(like) ?? false) ||
        (e.title?.toLowerCase().includes(like) ?? false)
    );

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      type: 'event',
      results: filtered.map((e) => ({
        id: e.id,
        type: e.type,
        name: e.name,
        path: e.path,
        title: e.title,
        visitorId: e.visitorId,
        at: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Analytics explorer error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
