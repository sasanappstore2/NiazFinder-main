import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';
import { cityLabel, provinceLabel } from '@/lib/analytics/geo-location-index';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

function marketLandingFilter(market: string | null) {
  if (!market || market === 'all') return {};
  if (market === 'business') return { landingPath: { startsWith: '/b/' } };
  return { NOT: { landingPath: { startsWith: '/b/' } } };
}

function loadCityCoords(provinceId: string) {
  const file = path.join(process.cwd(), 'src/data/geo/iran-cities-centroids.json');
  const cities = JSON.parse(fs.readFileSync(file, 'utf8')).cities as Array<{
    cityId: string;
    provinceId: string;
    lat: number;
    lng: number;
    name: string;
  }>;
  return cities.filter((c) => c.provinceId === provinceId);
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const params = request.nextUrl.searchParams;
    const province = params.get('province');
    if (!province) {
      return NextResponse.json({ error: 'province required' }, { status: 400 });
    }

    const range = parseDateRange(params);
    const market = params.get('market');

    const sessions = await db.analyticsSession.findMany({
      where: {
        province,
        firstSeen: { gte: range.from, lte: range.to },
        ...(marketLandingFilter(market)),
      },
      select: { city: true, pageViewCount: true },
    });

    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (!s.city) continue;
      counts.set(s.city, (counts.get(s.city) ?? 0) + 1);
    }

    const coords = loadCityCoords(province);
    const total = sessions.length;

    const rows = coords.map((c) => ({
      key: c.cityId,
      label: cityLabel(c.cityId) || c.name,
      value: counts.get(c.cityId) ?? 0,
      sharePct: total ? Math.round(((counts.get(c.cityId) ?? 0) / total) * 100) : 0,
      lat: c.lat,
      lng: c.lng,
    }));

    rows.sort((a, b) => b.value - a.value);

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      level: 'city',
      province,
      provinceLabel: provinceLabel(province),
      rows,
      totalSessions: total,
    });
  } catch (error) {
    console.error('Geo cities error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
