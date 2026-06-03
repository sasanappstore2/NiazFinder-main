import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';
import {
  acquisitionChannelLabel,
  acquisitionMedium,
  acquisitionSource,
} from '@/lib/analytics/parse-page-context';

export const runtime = 'nodejs';

const CHANNELS = [
  'Direct',
  'Organic Search',
  'Paid Search',
  'Social',
  'Email',
  'Referral',
  'Affiliates',
  'Other',
] as const;

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const rowDim = request.nextUrl.searchParams.get('row') ?? 'channel';
    const colDim = request.nextUrl.searchParams.get('col') ?? 'landing';

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: {
        referrer: true,
        utmSource: true,
        utmMedium: true,
        landingPath: true,
      },
    });

    const dimValue = (
      s: (typeof sessions)[number],
      dim: string
    ): string => {
      if (dim === 'channel') {
        const source = acquisitionSource(s.referrer, s.utmSource);
        const medium = acquisitionMedium(s.utmMedium, s.referrer);
        return acquisitionChannelLabel(source, medium);
      }
      if (dim === 'source') return acquisitionSource(s.referrer, s.utmSource);
      if (dim === 'medium') return acquisitionMedium(s.utmMedium, s.referrer);
      if (dim === 'landing') return s.landingPath ?? '/';
      return '(unknown)';
    };

    const matrix = new Map<string, Map<string, number>>();
    for (const s of sessions) {
      const row = dimValue(s, rowDim);
      const col = dimValue(s, colDim);
      if (!matrix.has(row)) matrix.set(row, new Map());
      const inner = matrix.get(row)!;
      inner.set(col, (inner.get(col) ?? 0) + 1);
    }

    const colTotals = new Map<string, number>();
    for (const [, cols] of matrix) {
      for (const [col, count] of cols) {
        colTotals.set(col, (colTotals.get(col) ?? 0) + count);
      }
    }

    const topCols = Array.from(colTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key]) => key);

    const rowKeys =
      rowDim === 'channel'
        ? CHANNELS.filter((c) => matrix.has(c))
        : Array.from(matrix.keys()).sort(
            (a, b) =>
              Array.from(matrix.get(b)?.values() ?? []).reduce((s, v) => s + v, 0) -
              Array.from(matrix.get(a)?.values() ?? []).reduce((s, v) => s + v, 0)
          );

    const cells: Array<{ row: string; col: string; value: number }> = [];
    for (const row of rowKeys.slice(0, 12)) {
      const cols = matrix.get(row)!;
      for (const col of topCols) {
        cells.push({ row, col, value: cols.get(col) ?? 0 });
      }
    }

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      rowDim,
      colDim,
      rows: rowKeys.slice(0, 12),
      cols: topCols,
      cells,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Analytics acquisition matrix error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
