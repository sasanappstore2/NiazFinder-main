import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tileIntersectsIran } from '@/lib/business/map-tile-iran';
import {
  type MapTileStyle,
  resolveMapTileUpstreamChain,
} from '@/lib/map/tile-config';

const CACHE_DIR = path.join(process.cwd(), 'data', 'map-tiles-cache');
const UPSTREAM_TIMEOUT_MS = 6_000;
const MIN_TILE_BYTES = 400;

/** Fully transparent 1×1 PNG — outside-Iran tiles show empty map background. */
const OUTSIDE_IRAN_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Fallback when every upstream fails for an in-Iran tile. */
const PLACEHOLDER_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAI0lEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAA4McAO8AABZJxJAAAAABJRU5ErkJggg==',
  'base64'
);

export function isValidMapTilePng(buf: Buffer): boolean {
  return (
    buf.byteLength >= MIN_TILE_BYTES &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

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
  const file = cacheFilePath(style, z, x, y);
  try {
    const buf = await readFile(file);
    if (isValidMapTilePng(buf)) return buf;
    await unlink(file).catch(() => undefined);
    return null;
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
  if (!cacheEnabled() || !isValidMapTilePng(body)) return;
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
      headers: {
        Accept: 'image/png,image/webp,image/*',
        'User-Agent': 'NiazFinderMapTileProxy/1.0',
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return isValidMapTilePng(buf) ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUpstream(style: MapTileStyle, z: number, x: number, y: number): Promise<Buffer | null> {
  for (const template of resolveMapTileUpstreamChain(style)) {
    const tile = await fetchTileUrl(upstreamUrl(template, z, x, y));
    if (tile) return tile;
  }
  return null;
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
  if (cached) {
    return { body: cached, cache: 'hit' };
  }

  const upstream = await fetchUpstream(style, z, x, y);
  if (!upstream) {
    return { body: PLACEHOLDER_TILE, cache: 'placeholder' };
  }

  await writeCache(style, z, x, y, upstream);
  return { body: upstream, cache: cacheEnabled() ? 'miss' : 'bypass' };
}
