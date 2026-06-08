/** Pinned OpenFreeMap planet snapshot — upstream for one-time pre-warm / cache miss. */
export const MASHHAD_VECTOR_UPSTREAM_TILE_TEMPLATE =
  'https://tiles.openfreemap.org/planet/20260531_080002_pt/{z}/{x}/{y}.pbf';

/** Demotiles allows server-side fetch; cached locally after pre-warm. */
export const MASHHAD_VECTOR_UPSTREAM_GLYPH_TEMPLATE =
  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

export const MASHHAD_VECTOR_GLYPH_FONT = 'Noto Sans Regular';

/** Unicode glyph ranges to pre-warm for Persian street labels (256-codepoint blocks). */
export const MASHHAD_GLYPH_PREWARM_RANGES: string[] = (() => {
  const ranges: string[] = [];
  for (let start = 0; start <= 6144; start += 256) {
    ranges.push(`${start}-${start + 255}`);
  }
  return ranges;
})();

export function resolveMashhadVectorTileUrl(origin?: string): string {
  const path = '/api/map/vector/mashhad/{z}/{x}/{y}.pbf';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export function resolveMashhadTilejsonUrl(origin?: string): string {
  const path = '/api/map/vector/mashhad/tilejson';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export function resolveMashhadGlyphsUrl(origin?: string): string {
  const path = '/api/map/glyphs/{fontstack}/{range}.pbf';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}
