import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';
import {
  hasRollupCoverage,
  queryRollupTimeline,
  splitRollupRange,
} from '@/lib/analytics/query-rollup';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);

    const buckets = new Map<string, { pageViews: number; newUsers: number; newRequests: number }>();
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      buckets.set(dayKey(cursor), { pageViews: 0, newUsers: 0, newRequests: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const split = splitRollupRange(range.from, range.to);
    if (split && (await hasRollupCoverage(split.rollupFrom, split.rollupTo))) {
      const rollupPoints = await queryRollupTimeline(split.rollupFrom, split.rollupTo, 'pageViews');
      for (const p of rollupPoints) {
        const b = buckets.get(p.date);
        if (b) b.pageViews += p.value;
      }
    }

    const rawFrom = split?.rawFrom ?? range.from;
    const rawTo = split?.rawTo ?? range.to;
    const pvEvents = await db.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: rawFrom, lte: rawTo } },
      select: { createdAt: true },
    });
    for (const e of pvEvents) {
      const b = buckets.get(dayKey(e.createdAt));
      if (b) b.pageViews += 1;
    }

    const [users, requests] = await Promise.all([
      db.user.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: { createdAt: true },
      }),
      db.serviceRequest.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: { createdAt: true },
      }),
    ]);

    for (const u of users) {
      const b = buckets.get(dayKey(u.createdAt));
      if (b) b.newUsers += 1;
    }
    for (const r of requests) {
      const b = buckets.get(dayKey(r.createdAt));
      if (b) b.newRequests += 1;
    }

    const points = Array.from(buckets.entries()).map(([date, v]) => ({
      key: date,
      label: new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
        new Date(`${date}T12:00:00.000Z`)
      ),
      pageViews: v.pageViews,
      newUsers: v.newUsers,
      newRequests: v.newRequests,
    }));

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      points,
    });
  } catch (error) {
    console.error('Analytics platform correlation error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
