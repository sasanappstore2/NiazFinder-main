import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MASHHAD_VECTOR_UPSTREAM_GLYPH_TEMPLATE,
  MASHHAD_VECTOR_UPSTREAM_TILE_TEMPLATE,
} from '@/lib/map/mashhad/vector-tile-config';
import {
  tileIntersectsMashhad,
  MASHHAD_VECTOR_BOUNDS,
  MASHHAD_VECTOR_TILE_MAX_ZOOM,
  MASHHAD_VECTOR_TILE_MIN_ZOOM,
} from '@/lib/map/mashhad/vector-tile-bounds';
import { MASHHAD_MAP_CENTER } from '@/lib/map/mashhad/bounds';

const VECTOR_CACHE_DIR = path.join(process.cwd(), 'data', 'map-vector-cache', 'mashhad');
const GLYPH_CACHE_DIR = path.join(process.cwd(), 'data', 'map-vector-cache', 'glyphs');
const UPSTREAM_TIMEOUT_MS = 15_000;

function cacheEnabled(): boolean {
  const flag = process.env.MAP_VECTOR_CACHE_ENABLED;
  return flag !== 'false' && flag !== '0';
}

function vectorTileCachePath(z: number, x: number, y: number): string {
  return path.join(VECTOR_CACHE_DIR, String(z), String(x), `${y}.pbf`);
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

async function fetchBinary(
  url: string,
  accept: string
): Promise<Buffer | null> {
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
    if (buf.byteLength < 1) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type VectorTileResolveResult = {
  body: Buffer;
  cache: 'hit' | 'miss' | 'outside' | 'bypass';
};

export async function resolveMashhadVectorTile(
  z: number,
  x: number,
  y: number
): Promise<VectorTileResolveResult | null> {
  if (!tileIntersectsMashhad(z, x, y)) {
    return null;
  }

  const cacheFile = vectorTileCachePath(z, x, y);
  if (cacheEnabled()) {
    const cached = await readBinary(cacheFile);
    if (cached && cached.byteLength > 0) {
      return { body: cached, cache: 'hit' };
    }
  }

  const upstreamUrl = fillTemplate(MASHHAD_VECTOR_UPSTREAM_TILE_TEMPLATE, { z, x, y });
  const upstream = await fetchBinary(upstreamUrl, 'application/vnd.mapbox-vector-tile,*/*');
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

  const upstreamUrl = fillTemplate(MASHHAD_VECTOR_UPSTREAM_GLYPH_TEMPLATE, {
    fontstack,
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

export function buildMashhadVectorTilejson(origin: string) {
  const { west, south, east, north } = MASHHAD_VECTOR_BOUNDS;
  return {
    tilejson: '3.0.0',
    name: 'niazfinder-mashhad-vector',
    description: 'Self-hosted Mashhad OSM vector tiles (OpenFreeMap snapshot)',
    version: '1.0.0',
    attribution:
      '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    scheme: 'xyz',
    tiles: [`${origin}/api/map/vector/mashhad/{z}/{x}/{y}.pbf`],
    minzoom: MASHHAD_VECTOR_TILE_MIN_ZOOM,
    maxzoom: MASHHAD_VECTOR_TILE_MAX_ZOOM,
    bounds: [west, south, east, north],
    center: [MASHHAD_MAP_CENTER.lng, MASHHAD_MAP_CENTER.lat, 12],
    vector_layers: [
      { id: 'water', minzoom: 0, maxzoom: 14 },
      { id: 'park', minzoom: 4, maxzoom: 14 },
      { id: 'landuse', minzoom: 4, maxzoom: 14 },
      { id: 'building', minzoom: 13, maxzoom: 14 },
      { id: 'transportation', minzoom: 4, maxzoom: 14 },
      { id: 'transportation_name', minzoom: 6, maxzoom: 14 },
    ],
  };
}

export async function writeMashhadVectorTileToCache(
  z: number,
  x: number,
  y: number,
  body: Buffer
): Promise<void> {
  await writeBinary(vectorTileCachePath(z, x, y), body);
}

export async function writeMapGlyphToCache(
  fontstack: string,
  range: string,
  body: Buffer
): Promise<void> {
  await writeBinary(glyphCachePath(fontstack, range.replace(/\.pbf$/i, '')), body);
}

export function getMashhadVectorCacheDir(): string {
  return VECTOR_CACHE_DIR;
}
