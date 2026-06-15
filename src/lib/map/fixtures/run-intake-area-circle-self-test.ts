import assert from 'node:assert/strict';
import {
  buildIntakeAreaCircleGeoJson,
  clampIntakeAreaRadiusM,
  formatIntakeAreaRadiusFa,
  haversineDistanceM,
  intakeAreaFromBbox,
  intakeCircleRadiusPx,
  intakeRawRadiusMFromMapView,
  intakeSelectionFromMapView,
  intakeZoomForClampedRadius,
  intakeZoomForRadiusM,
  isIntakeAreaRadiusAtLimit,
  INTAKE_AREA_RADIUS_DEFAULT_M,
  INTAKE_AREA_RADIUS_MAX_M,
  INTAKE_AREA_RADIUS_MIN_M,
} from '@/lib/map/intake-area-circle';

const center = { lat: 36.3, lng: 59.6 };
const circle = buildIntakeAreaCircleGeoJson(center, INTAKE_AREA_RADIUS_DEFAULT_M);

assert.equal(circle.geometry.type, 'Polygon');
assert.ok(circle.geometry.coordinates[0]!.length >= 60);
assert.equal(clampIntakeAreaRadiusM(250), 300);
assert.equal(clampIntakeAreaRadiusM(1200), 1200);
assert.ok(formatIntakeAreaRadiusFa(1000).includes('\u06a9\u06cc\u0644\u0648\u0645\u062a\u0631'));
assert.ok(formatIntakeAreaRadiusFa(500).includes('\u0645\u062a\u0631'));

const viewport = { width: 320, height: 240 };
const circlePx = intakeCircleRadiusPx(viewport);
assert.ok(circlePx > 50);

const zoom = intakeZoomForRadiusM(center.lat, INTAKE_AREA_RADIUS_DEFAULT_M, viewport);
const clampedZoom = intakeZoomForClampedRadius(center.lat, INTAKE_AREA_RADIUS_MIN_M, viewport);
assert.ok(clampedZoom >= zoom);

const mockMap = {
  getCenter: () => center,
  getContainer: () => ({ clientWidth: viewport.width, clientHeight: viewport.height }),
  unproject: ([x, y]: [number, number]) => {
    const metersPerPixel =
      (156_543.03392 * Math.cos((center.lat * Math.PI) / 180)) / 2 ** zoom;
    const dLng =
      ((x - viewport.width / 2) * metersPerPixel) /
      (111_320 * Math.cos((center.lat * Math.PI) / 180));
    return { lat: center.lat, lng: center.lng + dLng };
  },
};
const picked = intakeSelectionFromMapView(mockMap);
assert.ok(Math.abs(picked.radiusM - INTAKE_AREA_RADIUS_DEFAULT_M) <= 200);
assert.ok(Math.abs(intakeRawRadiusMFromMapView(mockMap) - INTAKE_AREA_RADIUS_DEFAULT_M) <= 200);
assert.ok(haversineDistanceM(center.lat, center.lng, center.lat, center.lng + 0.01) > 800);
assert.equal(isIntakeAreaRadiusAtLimit(100), 'min');
assert.equal(isIntakeAreaRadiusAtLimit(9000), 'max');
assert.equal(isIntakeAreaRadiusAtLimit(1500), null);

const sajadBbox = {
  south: 36.3100433,
  north: 36.3261642,
  west: 59.5414772,
  east: 59.5699883,
};
const hoodArea = intakeAreaFromBbox(sajadBbox, { lat: 36.3196259, lng: 59.5541 });
assert.ok(hoodArea.radiusM >= 300);
assert.ok(hoodArea.radiusM <= 5000);
assert.ok(
  haversineDistanceM(hoodArea.lat, hoodArea.lng, sajadBbox.north, sajadBbox.east) <= hoodArea.radiusM + 50
);

console.log('[ok] intake area circle self-test');
