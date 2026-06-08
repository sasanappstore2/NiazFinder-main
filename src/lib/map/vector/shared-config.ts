/** Pinned OpenFreeMap planet snapshot — upstream for cache miss / pre-warm. */
export const VECTOR_UPSTREAM_TILE_TEMPLATE =
  'https://tiles.openfreemap.org/planet/20260531_080002_pt/{z}/{x}/{y}.pbf';

/** Demotiles allows server-side glyph fetch; cached locally after pre-warm. */
export const VECTOR_UPSTREAM_GLYPH_TEMPLATE =
  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

export const VECTOR_GLYPH_FONT = 'Noto Sans Regular';

/** Unicode glyph ranges for Persian/Arabic street labels. */
export const VECTOR_GLYPH_PREWARM_RANGES: string[] = (() => {
  const ranges: string[] = [];
  for (let start = 0; start <= 8192; start += 256) {
    ranges.push(`${start}-${start + 255}`);
  }
  return ranges;
})();
