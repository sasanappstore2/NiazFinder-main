import assert from 'node:assert/strict';
import {
  listMashhadVectorTileIndices,
  parseVectorTilePathParams,
  tileIntersectsMashhad,
} from '@/lib/map/mashhad/vector-tile-bounds';
import { buildIranVectorTilejson } from '@/lib/map/iran/vector-tile-proxy.server';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';

function run(): void {
  const tiles = listMashhadVectorTileIndices();
  assert.ok(tiles.length > 1000 && tiles.length < 2500, `unexpected tile count: ${tiles.length}`);

  for (const tile of tiles) {
    assert.ok(tileIntersectsMashhad(tile.z, tile.x, tile.y));
  }

  assert.ok(!tileIntersectsMashhad(10, 0, 0));
  assert.ok(!tileIntersectsMashhad(15, 0, 0));

  const parsed = parseVectorTilePathParams({ z: '14', x: '10545', y: '6448.pbf' });
  assert.deepEqual(parsed, { z: 14, x: 10545, y: 6448 });

  const tilejson = buildIranVectorTilejson('http://localhost:3000');
  assert.equal(tilejson.minzoom, 5);
  assert.ok(tilejson.tiles[0]?.includes('/api/map/vector/iran/'));

  const style = buildIranDivarStyle();
  assert.ok(String(style.glyphs).includes('/api/map/glyphs/'));
  const source = style.sources?.openmaptiles;
  assert.ok(
    source &&
      'tiles' in source &&
      source.tiles?.[0]?.includes('/api/map/vector/iran/{z}/{x}/{y}.pbf')
  );

  console.log('[ok] mashhad vector tiles self-test');
}

run();
