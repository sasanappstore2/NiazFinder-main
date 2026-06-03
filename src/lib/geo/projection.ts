import type { GeoViewBox } from '@/lib/geo/types';
import { IRAN_VIEW } from '@/lib/geo/types';

export function lonLatToSvg(
  lon: number,
  lat: number,
  view: GeoViewBox = IRAN_VIEW
): { x: number; y: number } {
  const x = ((lon - view.minLon) / (view.maxLon - view.minLon)) * view.width;
  const y = ((view.maxLat - lat) / (view.maxLat - view.minLat)) * view.height;
  return { x, y };
}

export function svgToLonLat(
  x: number,
  y: number,
  view: GeoViewBox = IRAN_VIEW
): { lon: number; lat: number } {
  const lon = view.minLon + (x / view.width) * (view.maxLon - view.minLon);
  const lat = view.maxLat - (y / view.height) * (view.maxLat - view.minLat);
  return { lon, lat };
}

/** Convert GeoJSON ring [lon,lat][] to SVG path d string. */
export function ringToSvgPath(ring: number[][], view: GeoViewBox = IRAN_VIEW): string {
  if (!ring.length) return '';
  const pts = ring.map(([lon, lat]) => lonLatToSvg(lon, lat, view));
  return (
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z'
  );
}

/** Multi-polygon GeoJSON coordinates to single SVG path. */
export function coordsToSvgPath(
  coordinates: number[][][][] | number[][][],
  view: GeoViewBox = IRAN_VIEW
): string {
  const polys =
    typeof coordinates[0]?.[0]?.[0] === 'number'
      ? [coordinates as number[][][]]
      : (coordinates as number[][][][]);

  return polys
    .flatMap((poly) => poly.map((ring) => ringToSvgPath(ring as number[][], view)))
    .join(' ');
}
