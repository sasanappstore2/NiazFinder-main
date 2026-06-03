import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';
import { parseUserAgent, uaBrowserLabel, uaOsLabel } from '@/lib/analytics/ua-parse';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const dim = request.nextUrl.searchParams.get('dim') ?? 'device';

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { device: true, browser: true, os: true },
    });

    const rows = groupByField(sessions, (s) => {
      if (dim === 'browserVersion' || dim === 'osVersion') {
        const parsed = parseUserAgent(
          dim === 'browserVersion'
            ? `Mozilla/5.0 (${s.os ?? 'unknown'}) ${s.browser ?? 'unknown'}`
            : `Mozilla/5.0 (${s.os ?? 'unknown'})`
        );
        parsed.browser = s.browser ?? parsed.browser;
        parsed.os = s.os ?? parsed.os;
        return dim === 'browserVersion' ? uaBrowserLabel(parsed) : uaOsLabel(parsed);
      }
      const field = dim === 'browser' ? 'browser' : dim === 'os' ? 'os' : 'device';
      const v = s[field as keyof typeof s];
      return (v as string) || 'unknown';
    });

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      dim,
      rows: rows.slice(0, 20),
      total: sessions.length,
    });
  } catch (error) {
    console.error('Analytics technology error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
