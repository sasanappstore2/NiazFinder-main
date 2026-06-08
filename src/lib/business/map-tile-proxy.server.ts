import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tileIntersectsIran } from '@/lib/business/map-tile-iran';
import {
  type MapTileStyle,
  resolveMapTileFallbackUpstream,
  resolveMapTileUpstream,
} from '@/lib/map/tile-config';

const CACHE_DIR = path.join(process.cwd(), 'data', 'map-tiles-cache');
const UPSTREAM_TIMEOUT_MS = 12_000;

/** Fully transparent 1×1 PNG — outside-Iran tiles show empty map background. */
const OUTSIDE_IRAN_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Fallback when upstream fails for an in-Iran tile. */
const PLACEHOLDER_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAI0lEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAA4McAO8AABZJxJAAAAABJRU5ErkJggg==',
  'base64'
);

function cacheEnabled(): boolean {
  const flag = process.env.MAP_TILE_CACHE_ENABLED;
  return flag !== 'false' && flag !== '0';
}

function cacheFilePath(style: MapTileStyle, z: number, x: number, y: number): string {
  return path.join(CACHE_DIR, style, String(z), String(x), `${y}.png`);
}

function upstreamUrl(template: string, z: number, x: number, y: number): string {
  return template
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

async function readCache(style: MapTileStyle, z: number, x: number, y: number): Promise<Buffer | null> {
  if (!cacheEnabled()) return null;
  try {
    return await readFile(cacheFilePath(style, z, x, y));
  } catch {
    return null;
  }
}

async function writeCache(
  style: MapTileStyle,
  z: number,
  x: number,
  y: number,
  body: Buffer
): Promise<void> {
  if (!cacheEnabled()) return;
  const file = cacheFilePath(style, z, x, y);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function fetchTileUrl(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'image/png,image/*' },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 200) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUpstream(style: MapTileStyle, z: number, x: number, y: number): Promise<Buffer | null> {
  const primary = await fetchTileUrl(upstreamUrl(resolveMapTileUpstream(style), z, x, y));
  if (primary) return primary;

  const fallbackTemplate = resolveMapTileFallbackUpstream();
  if (fallbackTemplate === resolveMapTileUpstream(style)) return null;

  return fetchTileUrl(upstreamUrl(fallbackTemplate, z, x, y));
}

export async function resolveIranMapTile(
  z: number,
  x: number,
  y: number,
  style: MapTileStyle = 'light'
): Promise<{
  body: Buffer;
  cache: 'hit' | 'miss' | 'placeholder' | 'bypass';
}> {
  if (!tileIntersectsIran(z, x, y)) {
    return { body: OUTSIDE_IRAN_TILE, cache: 'placeholder' };
  }

  const cached = await readCache(style, z, x, y);
  if (cached && cached.byteLength > 200) {
    return { body: cached, cache: 'hit' };
  }

  const upstream = await fetchUpstream(style, z, x, y);
  if (!upstream) {
    if (cached) return { body: cached, cache: 'hit' };
    return { body: PLACEHOLDER_TILE, cache: 'placeholder' };
  }

  await writeCache(style, z, x, y, upstream);
  return { body: upstream, cache: 'miss' };
}
