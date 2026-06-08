import { NextResponse } from 'next/server';
import { resolveMapGlyph } from '@/lib/map/iran/vector-tile-proxy.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GLYPH_HEADERS = {
  'Content-Type': 'application/x-protobuf',
  'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'X-Map-Glyph-Origin': 'niazfinder',
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ fontstack: string; range: string }> }
) {
  try {
    const { fontstack: rawFontstack, range: rawRange } = await context.params;
    const fontstack = decodeURIComponent(rawFontstack);
    const range = decodeURIComponent(rawRange);

    const resolved = await resolveMapGlyph(fontstack, range);
    if (!resolved) {
      return NextResponse.json({ error: 'Glyph unavailable' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(resolved.body), {
      status: 200,
      headers: {
        ...GLYPH_HEADERS,
        'X-Map-Glyph-Cache': resolved.cache,
      },
    });
  } catch (err) {
    console.error('[GET /api/map/glyphs]', err);
    return NextResponse.json({ error: 'Glyph unavailable' }, { status: 502 });
  }
}
