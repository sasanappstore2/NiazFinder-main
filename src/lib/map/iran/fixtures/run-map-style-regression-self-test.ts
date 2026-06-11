import assert from 'node:assert/strict';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranMapSurface } from '@/lib/map/iran/map-surface';
import {
  LOCAL_IRAN_GLYPHS_TEMPLATE,
  LOCAL_IRAN_VECTOR_TILE_TEMPLATE,
} from '@/lib/map/iran/vector-config';

function run(): void {
  const dark = buildIranDivarStyle('dark');
  const light = buildIranDivarStyle('light');

  for (const style of [dark, light]) {
    assert.ok(!style.layers?.some((l) => l.id === 'iran-void-mask'), 'void mask must stay removed');
    assert.ok(!style.sources?.['iran-void-mask'], 'void mask source must stay removed');
    assert.ok(style.layers?.some((l) => l.id === 'land'), 'land layer required for national zoom');
    assert.ok(
      style.layers?.some((l) => l.id === 'boundary-province'),
      'province boundaries required'
    );
    assert.equal(style.glyphs, LOCAL_IRAN_GLYPHS_TEMPLATE);

    const source = style.sources?.openmaptiles;
    assert.ok(source && 'tiles' in source);
    assert.equal(source.tiles?.[0], LOCAL_IRAN_VECTOR_TILE_TEMPLATE);
    assert.ok(!('url' in source && String((source as { url?: string }).url).includes('tilejson')));
  }

  assert.equal(resolveIranMapSurface('browse'), 'vector');
  assert.equal(resolveIranMapSurface('picker'), 'vector');

  console.log('[ok] map style regression self-test');
}

run();
