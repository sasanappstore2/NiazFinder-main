/**
 * Pre-download Mashhad vector tiles (z11–14) and Persian glyph ranges to disk cache.
 * Run: npm run map:prewarm-mashhad
 */
import { listMashhadVectorTileIndices } from '@/lib/map/mashhad/vector-tile-bounds';
import {
  EMPTY_VECTOR_TILE,
  VECTOR_GLYPH_PREWARM_RANGES,
  getIranVectorCacheDir,
  writeMapGlyphToCache,
  writeIranVectorTileToCache,
} from '@/lib/map/iran/vector-tile-proxy.server';
import {
  VECTOR_GLYPH_FONT,
  VECTOR_UPSTREAM_GLYPH_TEMPLATE,
  VECTOR_UPSTREAM_TILE_TEMPLATE,
} from '@/lib/map/vector/shared-config';

const CONCURRENCY = 8;
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

async function main(): Promise<void> {
  const tiles = listMashhadVectorTileIndices();
  let tileOk = 0;
  let tileFail = 0;

  console.log(`[prewarm] Mashhad vector tiles: ${tiles.length} (z11–14)`);
  const tileStart = Date.now();

  await runPool(tiles, async (tile, i) => {
    const url = fillTemplate(VECTOR_UPSTREAM_TILE_TEMPLATE, tile);
    const body = await fetchVectorTile(url);
    if (!body) {
      tileFail++;
      console.warn(`[prewarm] miss z${tile.z}/${tile.x}/${tile.y}`);
      return;
    }
    await writeIranVectorTileToCache(tile.z, tile.x, tile.y, body);
    tileOk++;
    if ((i + 1) % 200 === 0 || i + 1 === tiles.length) {
      console.log(`[prewarm] tiles ${i + 1}/${tiles.length}`);
    }
  });

  console.log(
    `[prewarm] tiles done in ${((Date.now() - tileStart) / 1000).toFixed(1)}s — ok=${tileOk} fail=${tileFail}`
  );

  let glyphOk = 0;
  let glyphFail = 0;
  const glyphStart = Date.now();
  const fontEncoded = encodeURIComponent(VECTOR_GLYPH_FONT);

  console.log(`[prewarm] Glyphs (${VECTOR_GLYPH_FONT}): ${VECTOR_GLYPH_PREWARM_RANGES.length} ranges`);

  await runPool(VECTOR_GLYPH_PREWARM_RANGES, async (range) => {
    const url = fillTemplate(VECTOR_UPSTREAM_GLYPH_TEMPLATE, {
      fontstack: fontEncoded,
      range,
    });
    const body = await fetchGlyph(url);
    if (!body) {
      glyphFail++;
      return;
    }
    await writeMapGlyphToCache(VECTOR_GLYPH_FONT, range, body);
    glyphOk++;
  });

  console.log(
    `[prewarm] glyphs done in ${((Date.now() - glyphStart) / 1000).toFixed(1)}s — ok=${glyphOk} fail=${glyphFail}`
  );
  console.log(`[prewarm] cache dir: ${getIranVectorCacheDir()}`);

  if (tileFail > tiles.length * 0.05 || glyphOk < VECTOR_GLYPH_PREWARM_RANGES.length * 0.8) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[prewarm] failed', err);
  process.exit(1);
});
