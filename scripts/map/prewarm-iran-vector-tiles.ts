/**
 * Pre-download Iran vector tiles to disk cache.
 *
 *   npm run map:prewarm-iran          # bootstrap: z5–10 + all cities z11–14 (~1 GB)
 *   npm run map:prewarm-iran:full     # entire Iran z5–14 (~13+ GB, hours)
 */
import { CITY_COORDINATES } from '@/lib/location/city-coordinates';
import { resolveBusinessMapCityBounds } from '@/lib/business/map-city-bounds';
import {
  IRAN_VECTOR_TILE_MAX_ZOOM,
  IRAN_VECTOR_TILE_MIN_ZOOM,
  listIranVectorTileIndices,
} from '@/lib/map/iran/vector-bounds';
import { listTilesInBbox } from '@/lib/map/vector/tile-math';
import {
  EMPTY_VECTOR_TILE,
  VECTOR_GLYPH_PREWARM_RANGES,
  writeIranVectorTileToCache,
  writeMapGlyphToCache,
  getIranVectorCacheDir,
} from '@/lib/map/iran/vector-tile-proxy.server';
import { VECTOR_GLYPH_FONT, VECTOR_UPSTREAM_GLYPH_TEMPLATE, VECTOR_UPSTREAM_TILE_TEMPLATE } from '@/lib/map/vector/shared-config';

const CONCURRENCY = 10;
const UPSTREAM_TIMEOUT_MS = 20_000;

function fillTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (url, [key, value]) => url.replace(`{${key}}`, String(value)),
    template
  );
}

async function fetchVectorTile(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) return EMPTY_VECTOR_TILE;
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 0 ? buf : EMPTY_VECTOR_TILE;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGlyph(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]!, i);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));
}

function dedupeTiles(
  tiles: Array<{ z: number; x: number; y: number }>
): Array<{ z: number; x: number; y: number }> {
  const seen = new Set<string>();
  const out: Array<{ z: number; x: number; y: number }> = [];
  for (const t of tiles) {
    const key = `${t.z}/${t.x}/${t.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function listBootstrapTiles(): Array<{ z: number; x: number; y: number }> {
  const national = listIranVectorTileIndices(5, 10);
  const cityTiles: Array<{ z: number; x: number; y: number }> = [];

  for (const city of CITY_COORDINATES) {
    const bbox = resolveBusinessMapCityBounds([city.slug]);
    if (!bbox) continue;
    cityTiles.push(
      ...listTilesInBbox(
        bbox.west - 0.04,
        bbox.south - 0.03,
        bbox.east + 0.04,
        bbox.north + 0.03,
        11,
        14
      )
    );
  }

  return dedupeTiles([...national, ...cityTiles]);
}

function parseArgs(): { full: boolean } {
  return { full: process.argv.includes('--full') };
}

async function prewarmTiles(tiles: Array<{ z: number; x: number; y: number }>): Promise<{
  ok: number;
  fail: number;
}> {
  let ok = 0;
  let fail = 0;
  const start = Date.now();

  await runPool(tiles, async (tile, i) => {
    const url = fillTemplate(VECTOR_UPSTREAM_TILE_TEMPLATE, tile);
    const body = await fetchVectorTile(url);
    if (!body) {
      fail++;
      return;
    }
    await writeIranVectorTileToCache(tile.z, tile.x, tile.y, body);
    ok++;
    if ((i + 1) % 500 === 0 || i + 1 === tiles.length) {
      console.log(`[prewarm] tiles ${i + 1}/${tiles.length}`);
    }
  });

  console.log(
    `[prewarm] tiles done in ${((Date.now() - start) / 1000).toFixed(1)}s — ok=${ok} fail=${fail}`
  );
  return { ok, fail };
}

async function prewarmGlyphs(): Promise<void> {
  let ok = 0;
  let fail = 0;
  const fontEncoded = encodeURIComponent(VECTOR_GLYPH_FONT);

  await runPool(VECTOR_GLYPH_PREWARM_RANGES, async (range) => {
    const url = fillTemplate(VECTOR_UPSTREAM_GLYPH_TEMPLATE, {
      fontstack: fontEncoded,
      range,
    });
    const body = await fetchGlyph(url);
    if (!body) {
      fail++;
      return;
    }
    await writeMapGlyphToCache(VECTOR_GLYPH_FONT, range, body);
    ok++;
  });

  console.log(`[prewarm] glyphs ok=${ok} fail=${fail}`);
}

async function main(): Promise<void> {
  const { full } = parseArgs();
  const tiles = full
    ? listIranVectorTileIndices(IRAN_VECTOR_TILE_MIN_ZOOM, IRAN_VECTOR_TILE_MAX_ZOOM)
    : listBootstrapTiles();

  console.log(
    `[prewarm] Iran vector — mode=${full ? 'full' : 'bootstrap'} tiles=${tiles.length.toLocaleString('en-US')}`
  );
  if (full) {
    console.warn('[prewarm] Full mode may download ~13+ GB and take several hours.');
  }

  const { ok, fail } = await prewarmTiles(tiles);
  await prewarmGlyphs();
  console.log(`[prewarm] cache dir: ${getIranVectorCacheDir()}`);

  if (fail > tiles.length * 0.02) {
    process.exitCode = 1;
  } else if (ok === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[prewarm] failed', err);
  process.exit(1);
});
