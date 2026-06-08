import { NextResponse } from 'next/server';
import { parseTilePathParams } from '@/lib/business/map-tile-iran';
import { resolveIranMapTile } from '@/lib/business/map-tile-proxy.server';
import { normalizeMapTileStyle } from '@/lib/map/tile-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TILE_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'X-Map-Tile-Origin': 'niazfinder-iran',
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const params = parseTilePathParams(await context.params);
    if (!params) {
      return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const style = normalizeMapTileStyle(searchParams.get('theme'));
    const { body, cache } = await resolveIranMapTile(params.z, params.x, params.y, style);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        ...TILE_HEADERS,
        'X-Map-Tile-Cache': cache,
        'X-Map-Tile-Style': style,
      },
    });
  } catch (err) {
    console.error('[GET /api/map/tiles]', err);
    return NextResponse.json({ error: 'Tile unavailable' }, { status: 502 });
  }
}
