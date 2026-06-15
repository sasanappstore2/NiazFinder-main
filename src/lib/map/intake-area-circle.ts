import circle from '@turf/circle';
import type { Feature, Polygon } from 'geojson';

export type IntakeMapAreaSelection = {
  lat: number;
  lng: number;
  radiusM: number;
};

export const INTAKE_AREA_RADIUS_MIN_M = 300;
export const INTAKE_AREA_RADIUS_MAX_M = 5000;
export const INTAKE_AREA_RADIUS_DEFAULT_M = 1000;
export const INTAKE_AREA_RADIUS_STEP_M = 100;
/** Fixed on-screen circle size as a fraction of the smaller map edge. */
export const INTAKE_AREA_CIRCLE_RADIUS_RATIO = 0.34;

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_PIXEL_AT_EQUATOR_ZOOM_0 = 156_543.03392;

export function clampIntakeAreaRadiusM(radiusM: number): number {
  const rounded = Math.round(radiusM / INTAKE_AREA_RADIUS_STEP_M) * INTAKE_AREA_RADIUS_STEP_M;
  return Math.min(INTAKE_AREA_RADIUS_MAX_M, Math.max(INTAKE_AREA_RADIUS_MIN_M, rounded));
}

export function intakeCircleRadiusPx(viewport: { width: number; height: number }): number {
  return Math.min(viewport.width, viewport.height) * INTAKE_AREA_CIRCLE_RADIUS_RATIO;
}

export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function intakeZoomForRadiusM(
  lat: number,
  radiusM: number,
  viewport: { width: number; height: number },
  minZoom = 10,
  maxZoom = 18
): number {
  const circlePx = intakeCircleRadiusPx(viewport);
  if (circlePx <= 0 || radiusM <= 0) return minZoom;
  const metersPerPixel = radiusM / circlePx;
  const rawZoom = Math.log2(
    (METERS_PER_PIXEL_AT_EQUATOR_ZOOM_0 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel
  );
  return Math.min(maxZoom, Math.max(minZoom, rawZoom));
}

type MapLike = {
  getCenter: () => { lat: number; lng: number };
  getContainer: () => HTMLElement;
  unproject: (point: [number, number]) => { lat: number; lng: number };
};

export function intakeRawRadiusMFromMapView(map: MapLike): number {
  const center = map.getCenter();
  const container = map.getContainer();
  const circlePx = intakeCircleRadiusPx({
    width: container.clientWidth,
    height: container.clientHeight,
  });
  const width = container.clientWidth;
  const height = container.clientHeight;
  const edge = map.unproject([width / 2 + circlePx, height / 2]);
  return haversineDistanceM(center.lat, center.lng, edge.lat, edge.lng);
}

export function intakeSelectionFromMapView(map: MapLike): IntakeMapAreaSelection {
  const center = map.getCenter();
  return {
    lat: center.lat,
    lng: center.lng,
    radiusM: clampIntakeAreaRadiusM(intakeRawRadiusMFromMapView(map)),
  };
}

/** Zoom that matches a clamped radius at the given viewport (for snap-back at min/max). */
export function intakeZoomForClampedRadius(
  lat: number,
  radiusM: number,
  viewport: { width: number; height: number },
  minZoom = 10,
  maxZoom = 18
): number {
  return intakeZoomForRadiusM(lat, clampIntakeAreaRadiusM(radiusM), viewport, minZoom, maxZoom);
}

export function buildIntakeAreaCircleGeoJson(
  center: { lat: number; lng: number },
  radiusM: number
): Feature<Polygon> {
  return circle([center.lng, center.lat], radiusM / 1000, {
    steps: 64,
    units: 'kilometers',
  });
}

const KM_UNIT = '\u06a9\u06cc\u0644\u0648\u0645\u062a\u0631';
const M_UNIT = '\u0645\u062a\u0631';

export function formatIntakeAreaRadiusFa(radiusM: number): string {
  if (radiusM >= 1000 && radiusM % 1000 === 0) {
    return `${(radiusM / 1000).toLocaleString('fa-IR')} ${KM_UNIT}`;
  }
  if (radiusM >= 1000) {
    const km = (radiusM / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 });
    return `${km} ${KM_UNIT}`;
  }
  return `${radiusM.toLocaleString('fa-IR')} ${M_UNIT}`;
}

export type IntakeAreaBbox = {
  south: number;
  north: number;
  west: number;
  east: number;
};

/** Circle centered on neighborhood that covers its full bbox (for auto-selection). */
export function intakeAreaFromBbox(
  bbox: IntakeAreaBbox,
  center?: { lat: number; lng: number } | null,
  padding = 1.08
): IntakeMapAreaSelection {
  const lat = center?.lat ?? (bbox.south + bbox.north) / 2;
  const lng = center?.lng ?? (bbox.west + bbox.east) / 2;
  const corners: Array<[number, number]> = [
    [bbox.south, bbox.west],
    [bbox.south, bbox.east],
    [bbox.north, bbox.west],
    [bbox.north, bbox.east],
  ];
  let maxR = 0;
  for (const [cLat, cLng] of corners) {
    maxR = Math.max(maxR, haversineDistanceM(lat, lng, cLat, cLng));
  }
  return {
    lat,
    lng,
    radiusM: clampIntakeAreaRadiusM(maxR * padding),
  };
}

export function isIntakeAreaRadiusAtLimit(rawRadiusM: number): 'min' | 'max' | null {
  const clamped = clampIntakeAreaRadiusM(rawRadiusM);
  if (rawRadiusM < INTAKE_AREA_RADIUS_MIN_M && clamped === INTAKE_AREA_RADIUS_MIN_M) return 'min';
  if (rawRadiusM > INTAKE_AREA_RADIUS_MAX_M && clamped === INTAKE_AREA_RADIUS_MAX_M) return 'max';
  return null;
}
