import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';
import {
  acquisitionChannelLabel,
  acquisitionMedium,
  acquisitionSource,
} from '@/lib/analytics/parse-page-context';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const groupBy = request.nextUrl.searchParams.get('groupBy') ?? 'source';

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: {
        referrer: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        landingPath: true,
      },
    });

    let rows: ReturnType<typeof groupByField>;
    if (groupBy === 'medium') {
      rows = groupByField(sessions, (s) =>
        acquisitionMedium(s.utmMedium, s.referrer)
      );
    } else if (groupBy === 'campaign') {
      rows = groupByField(sessions, (s) => s.utmCampaign ?? '(not set)');
    } else if (groupBy === 'referrer') {
      rows = groupByField(sessions, (s) => {
        if (!s.referrer) return '(direct)';
        try {
          return new URL(s.referrer).hostname.replace(/^www\./, '');
        } catch {
          return '(invalid)';
        }
      });
    } else if (groupBy === 'landing') {
      rows = groupByField(sessions, (s) => s.landingPath ?? '/');
    } else if (groupBy === 'channel') {
      rows = groupByField(sessions, (s) => {
        const source = acquisitionSource(s.referrer, s.utmSource);
        const medium = acquisitionMedium(s.utmMedium, s.referrer);
        return acquisitionChannelLabel(source, medium);
      });
    } else {
      rows = groupByField(sessions, (s) =>
        acquisitionSource(s.referrer, s.utmSource)
      );
    }

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      groupBy,
      rows: rows.slice(0, 50),
      total: sessions.length,
    });
  } catch (error) {
    console.error('Analytics acquisition error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
