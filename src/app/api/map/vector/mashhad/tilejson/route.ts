import { NextResponse } from 'next/server';
import { buildIranVectorTilejson } from '@/lib/map/iran/vector-tile-proxy.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { origin } = new URL(request.url);
    const tilejson = buildIranVectorTilejson(origin);

    return NextResponse.json(tilejson, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Map-Vector-Origin': 'niazfinder-mashhad',
      },
    });
  } catch (err) {
    console.error('[GET /api/map/vector/mashhad/tilejson]', err);
    return NextResponse.json({ error: 'Tilejson unavailable' }, { status: 502 });
  }
}
