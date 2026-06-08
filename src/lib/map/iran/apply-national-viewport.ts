import {
  IRAN_VIEW_BOUNDS_LNG_LAT,
  IRAN_VIEW_FIT_BOUNDS,
  IRAN_VIEW_FIT_PADDING,
} from '@/lib/map/iran/viewport-geo';

type MapViewportApi = {
  setMaxBounds(bounds: [[number, number], [number, number]]): void;
  fitBounds(
    bounds: [[number, number], [number, number]],
    options: { padding: number; duration: number; maxZoom: number }
  ): void;
  getZoom(): number;
  setMinZoom(zoom: number): void;
};

/** Fit all of Iran in the frame and lock min zoom so neighbors never appear. */
export function applyIranNationalViewport(
  map: MapViewportApi,
  padding = IRAN_VIEW_FIT_PADDING
): number | null {
  map.setMaxBounds(IRAN_VIEW_BOUNDS_LNG_LAT);
  map.fitBounds(IRAN_VIEW_FIT_BOUNDS, { padding, duration: 0, maxZoom: 14 });
  const zoom = map.getZoom();
  if (!Number.isFinite(zoom)) return null;
  map.setMinZoom(zoom);
  return zoom;
}
