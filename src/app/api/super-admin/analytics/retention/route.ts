import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

function weekStart(d: Date): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const cohortWeeks = Math.min(Number(request.nextUrl.searchParams.get('weeks') ?? 8), 12);

    const allSessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { visitorId: true, sessionId: true, firstSeen: true },
      orderBy: { firstSeen: 'asc' },
    });

    const firstSeenByVisitor = new Map<string, Date>();
    for (const s of allSessions) {
      if (!firstSeenByVisitor.has(s.visitorId)) {
        firstSeenByVisitor.set(s.visitorId, s.firstSeen);
      }
    }

    const cohorts = new Map<string, Set<string>>();
    for (const [visitorId, firstSeen] of firstSeenByVisitor) {
      const wk = weekStart(firstSeen);
      if (!cohorts.has(wk)) cohorts.set(wk, new Set());
      cohorts.get(wk)!.add(visitorId);
    }

    const sortedCohorts = Array.from(cohorts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, cohortWeeks);

    const returnSessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { visitorId: true, firstSeen: true },
    });

    const returnsByVisitorWeek = new Map<string, Set<number>>();
    for (const s of returnSessions) {
      const first = firstSeenByVisitor.get(s.visitorId);
      if (!first) continue;
      const offsetWeeks = Math.floor(
        (weekStart(s.firstSeen).localeCompare(weekStart(first)) === 0
          ? 0
          : (new Date(weekStart(s.firstSeen)).getTime() - new Date(weekStart(first)).getTime()) /
            (7 * 86400000))
      );
      if (offsetWeeks < 0) continue;
      const key = `${weekStart(first)}`;
      if (!returnsByVisitorWeek.has(key)) returnsByVisitorWeek.set(key, new Set());
      returnsByVisitorWeek.get(key)!.add(offsetWeeks);
    }

    const rows = sortedCohorts.map(([cohortDate, visitors]) => {
      const size = visitors.size;
      const cells: number[] = [];
      for (let w = 0; w < cohortWeeks; w++) {
        if (w === 0) {
          cells.push(100);
          continue;
        }
        let returned = 0;
        for (const vid of visitors) {
          const sessions = returnSessions.filter((s) => s.visitorId === vid);
          const first = firstSeenByVisitor.get(vid)!;
          const hasReturn = sessions.some((s) => {
            const offset = Math.floor(
              (new Date(weekStart(s.firstSeen)).getTime() - new Date(weekStart(first)).getTime()) /
                (7 * 86400000)
            );
            return offset === w;
          });
          if (hasReturn) returned += 1;
        }
        cells.push(size ? Math.round((returned / size) * 100) : 0);
      }
      return {
        cohort: cohortDate,
        label: new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
          new Date(`${cohortDate}T12:00:00.000Z`)
        ),
        size,
        cells,
      };
    });

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      weeks: cohortWeeks,
      rows,
    });
  } catch (error) {
    console.error('Analytics retention error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
