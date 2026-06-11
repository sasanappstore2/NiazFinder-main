/** Same-origin vector tiles — served from local cache via `/api/map/vector/iran`. */
export const LOCAL_IRAN_VECTOR_TILE_TEMPLATE = '/api/map/vector/iran/{z}/{x}/{y}.pbf';

/** Same-origin glyphs — served from local cache via `/api/map/glyphs`. */
export const LOCAL_IRAN_GLYPHS_TEMPLATE = '/api/map/glyphs/{fontstack}/{range}.pbf';

export function resolveIranVectorTileUrl(origin?: string): string {
  if (origin) return `${origin}${LOCAL_IRAN_VECTOR_TILE_TEMPLATE}`;
  return LOCAL_IRAN_VECTOR_TILE_TEMPLATE;
}

export function resolveIranTilejsonUrl(origin?: string): string {
  const path = '/api/map/vector/iran/tilejson';
  if (origin) return `${origin}${path}`;
  return path;
}

export function resolveIranGlyphsUrl(origin?: string): string {
  if (origin) return `${origin}${LOCAL_IRAN_GLYPHS_TEMPLATE}`;
  return LOCAL_IRAN_GLYPHS_TEMPLATE;
}
