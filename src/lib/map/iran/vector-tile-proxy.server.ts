import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  VECTOR_GLYPH_PREWARM_RANGES,
  VECTOR_UPSTREAM_GLYPH_TEMPLATE,
  VECTOR_UPSTREAM_TILE_TEMPLATE,
} from '@/lib/map/vector/shared-config';
import {
  IRAN_VECTOR_BOUNDS,
  IRAN_VECTOR_TILE_MAX_ZOOM,
  IRAN_VECTOR_TILE_MIN_ZOOM,
  tileIntersectsIranVector,
} from '@/lib/map/iran/vector-bounds';

const CACHE_ROOT = path.join(process.cwd(), 'data', 'map-vector-cache');
const IRAN_CACHE_DIR = path.join(CACHE_ROOT, 'iran');
const LEGACY_MASHHAD_CACHE_DIR = path.join(CACHE_ROOT, 'mashhad');
const GLYPH_CACHE_DIR = path.join(CACHE_ROOT, 'glyphs');
const UPSTREAM_TIMEOUT_MS = 6_000;

/** Gzip-compressed empty MVT — no-data tiles at bbox edges. */
export const EMPTY_VECTOR_TILE = Buffer.from(
  'H4sIAAAAAAAAA+3BMQEAAADCoPdzbQh8KAADgFcBz0AABQAAAADvBj0OAAAAAA==',
  'base64'
);

function cacheEnabled(): boolean {
  const flag = process.env.MAP_VECTOR_CACHE_ENABLED;
  return flag !== 'false' && flag !== '0';
}

function iranTileCachePath(z: number, x: number, y: number): string {
  return path.join(IRAN_CACHE_DIR, String(z), String(x), `${y}.pbf`);
}

function legacyMashhadTileCachePath(z: number, x: number, y: number): string {
  return path.join(LEGACY_MASHHAD_CACHE_DIR, String(z), String(x), `${y}.pbf`);
}

function glyphCachePath(fontstack: string, range: string): string {
  const safeFont = fontstack.replace(/[/\\]/g, '_');
  return path.join(GLYPH_CACHE_DIR, safeFont, `${range}.pbf`);
}

function fillTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (url, [key, value]) => url.replace(`{${key}}`, String(value)),
    template
  );
}

async function readBinary(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

async function writeBinary(file: string, body: Buffer): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function readVectorTileCache(z: number, x: number, y: number): Promise<Buffer | null> {
  const primary = await readBinary(iranTileCachePath(z, x, y));
  if (primary && primary.byteLength > 0) return primary;
  const legacy = await readBinary(legacyMashhadTileCachePath(z, x, y));
  if (legacy && legacy.byteLength > 0) return legacy;
  return null;
}

async function fetchVectorTileUpstream(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.mapbox-vector-tile,*/*' },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (res.status === 404) return EMPTY_VECTOR_TILE;
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 4) return EMPTY_VECTOR_TILE;
    const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
    const isProtobuf = buf[0] === 0x1a;
    if (!isGzip && !isProtobuf) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinary(url: string, accept: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: accept },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 1 ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type VectorTileResolveResult = {
  body: Buffer;
  cache: 'hit' | 'miss' | 'bypass';
};

export async function resolveIranVectorTile(
  z: number,
  x: number,
  y: number
): Promise<VectorTileResolveResult | null> {
  if (!tileIntersectsIranVector(z, x, y)) return null;

  if (cacheEnabled()) {
    const cached = await readVectorTileCache(z, x, y);
    if (cached) return { body: cached, cache: 'hit' };
  }

  const upstreamUrl = fillTemplate(VECTOR_UPSTREAM_TILE_TEMPLATE, { z, x, y });
  const upstream = await fetchVectorTileUpstream(upstreamUrl);
  if (!upstream) {
    const stale = cacheEnabled() ? await readVectorTileCache(z, x, y) : null;
    if (stale) return { body: stale, cache: 'hit' };
    return null;
  }

  if (cacheEnabled()) {
    await writeBinary(iranTileCachePath(z, x, y), upstream);
  }

  return { body: upstream, cache: cacheEnabled() ? 'miss' : 'bypass' };
}

/** @deprecated Use resolveIranVectorTile — Mashhad tiles are a subset of Iran. */
export async function resolveMashhadVectorTile(
  z: number,
  x: number,
  y: number
): Promise<VectorTileResolveResult | null> {
  return resolveIranVectorTile(z, x, y);
}

export type GlyphResolveResult = {
  body: Buffer;
  cache: 'hit' | 'miss' | 'bypass';
};

export async function resolveMapGlyph(
  fontstack: string,
  range: string
): Promise<GlyphResolveResult | null> {
  const normalizedRange = range.replace(/\.pbf$/i, '');
  if (!/^\d+-\d+$/.test(normalizedRange)) return null;
  if (!fontstack.trim()) return null;

  const cacheFile = glyphCachePath(fontstack, normalizedRange);
  if (cacheEnabled()) {
    const cached = await readBinary(cacheFile);
    if (cached && cached.byteLength > 0) {
      return { body: cached, cache: 'hit' };
    }
  }

  const upstreamUrl = fillTemplate(VECTOR_UPSTREAM_GLYPH_TEMPLATE, {
    fontstack: encodeURIComponent(fontstack),
    range: normalizedRange,
  });
  const upstream = await fetchBinary(upstreamUrl, 'application/x-protobuf,*/*');
  if (!upstream) {
    const stale = cacheEnabled() ? await readBinary(cacheFile) : null;
    if (stale) return { body: stale, cache: 'hit' };
    return null;
  }

  if (cacheEnabled()) {
    await writeBinary(cacheFile, upstream);
  }

  return { body: upstream, cache: cacheEnabled() ? 'miss' : 'bypass' };
}

export function buildIranVectorTilejson(origin: string) {
  const { west, south, east, north } = IRAN_VECTOR_BOUNDS;
  return {
    tilejson: '3.0.0',
    name: 'niazfinder-iran-vector',
    description: 'Self-hosted Iran OSM vector tiles (OpenFreeMap snapshot)',
    version: '1.0.0',
    attribution:
      '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    scheme: 'xyz',
    tiles: [`${origin}/api/map/vector/iran/{z}/{x}/{y}.pbf`],
    minzoom: IRAN_VECTOR_TILE_MIN_ZOOM,
    maxzoom: IRAN_VECTOR_TILE_MAX_ZOOM,
    bounds: [west, south, east, north],
    center: [53.688, 32.428, 5.5],
    vector_layers: [
      { id: 'water', minzoom: 0, maxzoom: 14 },
      { id: 'waterway', minzoom: 4, maxzoom: 14 },
      { id: 'water_name', minzoom: 6, maxzoom: 14 },
      { id: 'landcover', minzoom: 4, maxzoom: 14 },
      { id: 'landuse', minzoom: 4, maxzoom: 14 },
      { id: 'park', minzoom: 4, maxzoom: 14 },
      { id: 'boundary', minzoom: 0, maxzoom: 14 },
      { id: 'place', minzoom: 4, maxzoom: 14 },
      { id: 'building', minzoom: 13, maxzoom: 14 },
      { id: 'transportation', minzoom: 4, maxzoom: 14 },
      { id: 'transportation_name', minzoom: 6, maxzoom: 14 },
    ],
  };
}

export async function writeIranVectorTileToCache(
  z: number,
  x: number,
  y: number,
  body: Buffer
): Promise<void> {
  await writeBinary(iranTileCachePath(z, x, y), body);
}

export async function writeMapGlyphToCache(
  fontstack: string,
  range: string,
  body: Buffer
): Promise<void> {
  await writeBinary(glyphCachePath(fontstack, range.replace(/\.pbf$/i, '')), body);
}

export function getIranVectorCacheDir(): string {
  return IRAN_CACHE_DIR;
}

export { VECTOR_GLYPH_PREWARM_RANGES };
