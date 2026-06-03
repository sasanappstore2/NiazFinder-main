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
    const nameFilter = request.nextUrl.searchParams.get('name');

    const events = await db.analyticsEvent.findMany({
      where: {
        type: 'event',
        createdAt: { gte: range.from, lte: range.to },
        ...(nameFilter ? { name: nameFilter } : {}),
      },
      select: { name: true, path: true, createdAt: true, properties: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const byName = groupByField(events, (e) => e.name ?? '(unnamed)');
    const byPath = groupByField(events, (e) => e.path).slice(0, 15);

    const timeline = new Map<string, number>();
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      timeline.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const e of events) {
      const k = e.createdAt.toISOString().slice(0, 10);
      if (timeline.has(k)) timeline.set(k, (timeline.get(k) ?? 0) + 1);
    }

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      total: events.length,
      byName: byName.slice(0, 30),
      byPath,
      timeline: Array.from(timeline.entries()).map(([date, value]) => ({
        date,
        label: new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
          new Date(`${date}T12:00:00.000Z`)
        ),
        value,
      })),
    });
  } catch (error) {
    console.error('Analytics events error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
