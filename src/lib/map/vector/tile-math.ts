export function lon2tile(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

export function lat2tile(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

export function listTilesInBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  zMin: number,
  zMax: number
): Array<{ z: number; x: number; y: number }> {
  const tiles: Array<{ z: number; x: number; y: number }> = [];
  for (let z = zMin; z <= zMax; z++) {
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
