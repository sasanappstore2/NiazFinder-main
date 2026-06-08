/** Geographic scope for self-hosted Iran map tiles. */
export const IRAN_MAP_BOUNDS = {
  south: 24.0,
  north: 40.5,
  west: 43.5,
  east: 64.5,
} as const;

const DEG = Math.PI / 180;

function tileYToLat(y: number, z: number): number {
  const n = 2 ** z;
  const rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return (rad * 180) / Math.PI;
}

function tileXToLng(x: number, z: number): number {
  const n = 2 ** z;
  return (x / n) * 360 - 180;
}

export function tileToBounds(z: number, x: number, y: number) {
  const north = tileYToLat(y, z);
  const south = tileYToLat(y + 1, z);
  const west = tileXToLng(x, z);
  const east = tileXToLng(x + 1, z);
  return { north, south, east, west };
}

export function tileIntersectsIran(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < 0 || z > 19) return false;
  const maxIndex = 2 ** z;
  if (x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) return false;

  const { north, south, east, west } = tileToBounds(z, x, y);
  return !(
    north < IRAN_MAP_BOUNDS.south ||
    south > IRAN_MAP_BOUNDS.north ||
    east < IRAN_MAP_BOUNDS.west ||
    west > IRAN_MAP_BOUNDS.east
  );
}

export function parseTilePathParams(raw: {
  z?: string;
  x?: string;
  y?: string;
}): { z: number; x: number; y: number } | null {
  const z = Number.parseInt(String(raw.z ?? ''), 10);
  const x = Number.parseInt(String(raw.x ?? ''), 10);
  const yRaw = String(raw.y ?? '').replace(/\.png$/i, '');
  const y = Number.parseInt(yRaw, 10);
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { z, x, y };
}
