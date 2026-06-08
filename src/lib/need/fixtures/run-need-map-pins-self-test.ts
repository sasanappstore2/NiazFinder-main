/**
 * Need map pin helpers — bbox + Iran bounds + pin validation.
 * Run: npm run test:need-map-pins
 */
import assert from 'node:assert/strict';
import { normalizeMapBbox } from '@/lib/map/bbox';
import { filterValidMapPins, isInIranLatLng, isValidLatLng } from '@/lib/map/coords';
import { getCategoryColor } from '@/lib/categories/category-colors';

function testNormalizeBbox() {
  const bbox = normalizeMapBbox({
    west: 59.4,
    south: 36.2,
    east: 59.7,
    north: 36.4,
  });
  assert.ok(bbox);
  assert.ok(bbox!.west < bbox!.east);
  assert.ok(bbox!.south < bbox!.north);
  assert.equal(normalizeMapBbox({ west: 0, south: 0, east: 0, north: 0 }), null);
}

function testMashhadInIran() {
  assert.equal(isInIranLatLng(36.297, 59.606), true);
  assert.equal(isInIranLatLng(51.5, -0.12), false);
  assert.equal(isValidLatLng(36.297, 59.606), true);
  assert.equal(isValidLatLng(Number.NaN, 59), false);
}

function testFilterValidPins() {
  const pins = [
    { id: 'a', lat: 36.3, lng: 59.6 },
    { id: 'b', lat: 999, lng: 59.6 },
    { id: 'c', lat: 35.7, lng: 51.4 },
  ];
  const valid = filterValidMapPins(pins);
  assert.equal(valid.length, 2);
  assert.deepEqual(
    valid.map((p) => p.id),
    ['a', 'c']
  );
}

function testCategoryPinColor() {
  const color = getCategoryColor('real-estate');
  assert.match(color, /^#[0-9a-f]{6}$/i);
}

testNormalizeBbox();
testMashhadInIran();
testFilterValidPins();
testCategoryPinColor();

console.log('run-need-map-pins-self-test: ok');
