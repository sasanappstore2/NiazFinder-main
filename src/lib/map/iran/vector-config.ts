export function resolveIranVectorTileUrl(origin?: string): string {
  const path = '/api/map/vector/iran/{z}/{x}/{y}.pbf';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export function resolveIranTilejsonUrl(origin?: string): string {
  const path = '/api/map/vector/iran/tilejson';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export function resolveIranGlyphsUrl(origin?: string): string {
  const path = '/api/map/glyphs/{fontstack}/{range}.pbf';
  if (origin) return `${origin}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}
