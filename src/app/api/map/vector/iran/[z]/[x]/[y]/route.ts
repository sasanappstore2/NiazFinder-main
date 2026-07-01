import { NextResponse } from 'next/server';
import zlib from 'node:zlib';
import {
  EMPTY_VECTOR_TILE,
  resolveIranVectorTile,
} from '@/lib/map/iran/vector-tile-proxy.server';
import { parseVectorTilePathParams } from '@/lib/map/vector/tile-math';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TILE_HEADERS = {
  'Content-Type': 'application/vnd.mapbox-vector-tile',
  'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'X-Map-Vector-Origin': 'niazfinder-iran',
} as const;

/** Cached tiles are gzip MVT; Next would double-gzip — serve raw protobuf to clients. */
function toResponseBody(body: Buffer): Buffer {
  if (body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b) {
    return zlib.gunzipSync(body);
  }
  return body;
}

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
    const raw = resolved?.body ?? EMPTY_VECTOR_TILE;
    const body = toResponseBody(raw);
    const cache = resolved?.cache ?? 'placeholder';

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        ...TILE_HEADERS,
        'X-Map-Vector-Cache': cache,
      },
    });
  } catch (err) {
    console.error('[GET /api/map/vector/iran]', err);
    return NextResponse.json({ error: 'Vector tile unavailable' }, { status: 502 });
  }
}
