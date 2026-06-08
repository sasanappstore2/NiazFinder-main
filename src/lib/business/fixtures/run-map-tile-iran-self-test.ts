import assert from 'node:assert/strict';
import {
  IRAN_MAP_BOUNDS,
  parseTilePathParams,
  tileIntersectsIran,
  tileToBounds,
} from '@/lib/business/map-tile-iran';

function testMashhadTileInIran() {
  const z = 13;
  const x = 5452;
  const y = 3208;
  assert.equal(tileIntersectsIran(z, x, y), true);
  const bounds = tileToBounds(z, x, y);
  assert.ok(bounds.north > IRAN_MAP_BOUNDS.south);
  assert.ok(bounds.south < IRAN_MAP_BOUNDS.north);
}

function testAtlanticTileOutsideIran() {
  assert.equal(tileIntersectsIran(5, 10, 10), false);
}

function testParseYWithExtension() {
  const parsed = parseTilePathParams({ z: '12', x: '2726', y: '1604.png' });
  assert.deepEqual(parsed, { z: 12, x: 2726, y: 1604 });
}

function testInvalidParams() {
  assert.equal(parseTilePathParams({ z: 'x', x: '1', y: '2' }), null);
  assert.equal(tileIntersectsIran(12, -1, 100), false);
}

testMashhadTileInIran();
testAtlanticTileOutsideIran();
testParseYWithExtension();
testInvalidParams();

console.log('run-map-tile-iran-self-test: ok');
