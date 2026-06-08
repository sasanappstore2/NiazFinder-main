import { NextResponse } from 'next/server';
import { parseVectorTilePathParams } from '@/lib/map/iran/vector-bounds';
import { resolveIranVectorTile } from '@/lib/map/iran/vector-tile-proxy.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TILE_HEADERS = {
  'Content-Type': 'application/vnd.mapbox-vector-tile',
  'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'X-Map-Vector-Origin': 'niazfinder-mashhad',
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const params = parseVectorTilePathParams(await context.params);
    if (!params) {
      return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
    }

    const resolved = await resolveIranVectorTile(params.z, params.x, params.y);
    if (!resolved) {
      return NextResponse.json({ error: 'Tile outside Mashhad bounds' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(resolved.body), {
      status: 200,
      headers: {
        ...TILE_HEADERS,
        'X-Map-Vector-Cache': resolved.cache,
      },
    });
  } catch (err) {
    console.error('[GET /api/map/vector/mashhad]', err);
    return NextResponse.json({ error: 'Vector tile unavailable' }, { status: 502 });
  }
}
