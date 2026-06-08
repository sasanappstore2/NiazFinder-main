import { tileToBounds } from '@/lib/business/map-tile-iran';
import { MASHHAD_MAX_BOUNDS } from '@/lib/map/mashhad/bounds';

/** Geographic bounds for self-hosted Mashhad vector tiles (with pan padding). */
export const MASHHAD_VECTOR_BOUNDS = {
  west: MASHHAD_MAX_BOUNDS[0][0],
  south: MASHHAD_MAX_BOUNDS[0][1],
  east: MASHHAD_MAX_BOUNDS[1][0],
  north: MASHHAD_MAX_BOUNDS[1][1],
} as const;

export const MASHHAD_VECTOR_TILE_MIN_ZOOM = 11;
export const MASHHAD_VECTOR_TILE_MAX_ZOOM = 14;

export function tileIntersectsMashhad(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < MASHHAD_VECTOR_TILE_MIN_ZOOM || z > MASHHAD_VECTOR_TILE_MAX_ZOOM) return false;
  const maxIndex = 2 ** z;
  if (x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) return false;

  const { north, south, east, west } = tileToBounds(z, x, y);
  return !(
    north < MASHHAD_VECTOR_BOUNDS.south ||
    south > MASHHAD_VECTOR_BOUNDS.north ||
    east < MASHHAD_VECTOR_BOUNDS.west ||
    west > MASHHAD_VECTOR_BOUNDS.east
  );
}

export function lon2tile(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

export function lat2tile(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

/** Every z/x/y tile index inside Mashhad bounds for pre-warm scripts. */
export function listMashhadVectorTileIndices(): Array<{ z: number; x: number; y: number }> {
  const tiles: Array<{ z: number; x: number; y: number }> = [];
  const { west, south, east, north } = MASHHAD_VECTOR_BOUNDS;

  for (let z = MASHHAD_VECTOR_TILE_MIN_ZOOM; z <= MASHHAD_VECTOR_TILE_MAX_ZOOM; z++) {
    const x0 = lon2tile(west, z);
    const x1 = lon2tile(east, z);
    const y0 = lat2tile(north, z);
    const y1 = lat2tile(south, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

export function parseVectorTilePathParams(raw: {
  z?: string;
  x?: string;
  y?: string;
}): { z: number; x: number; y: number } | null {
  const z = Number.parseInt(String(raw.z ?? ''), 10);
  const x = Number.parseInt(String(raw.x ?? ''), 10);
  const yRaw = String(raw.y ?? '').replace(/\.pbf$/i, '');
  const y = Number.parseInt(yRaw, 10);
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { z, x, y };
}
