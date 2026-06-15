import assert from 'node:assert/strict';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranMapSurface } from '@/lib/map/iran/map-surface';
import { isFatalIranVectorMapError } from '@/lib/map/iran/map-error-utils';
import {
  LOCAL_IRAN_GLYPHS_TEMPLATE,
  LOCAL_IRAN_VECTOR_TILE_TEMPLATE,
} from '@/lib/map/iran/vector-config';

function run(): void {
  const dark = buildIranDivarStyle('dark');
  const light = buildIranDivarStyle('light');

  for (const style of [dark, light]) {
    assert.ok(style.layers?.some((l) => l.id === 'iran-neighbor-void'), 'neighbor void mask required');
    assert.ok(style.layers?.some((l) => l.id === 'iran-world-void'), 'world void mask required');
    assert.ok(style.sources?.['iran-void-mask'], 'void mask geojson source required');
    const maskSource = style.sources?.['iran-void-mask'];
    assert.ok(maskSource && 'data' in maskSource);
    assert.equal(maskSource.data, '/geo/iran-map-void-mask.geojson');
    const layers = style.layers ?? [];
    const neighborIdx = layers.findIndex((l) => l.id === 'iran-neighbor-void');
    const waterIdx = layers.findIndex((l) => l.id === 'water');
    const worldIdx = layers.findIndex((l) => l.id === 'iran-world-void');
    assert.ok(neighborIdx >= 0 && waterIdx > neighborIdx, 'water must render above neighbor void');
    assert.equal(layers[worldIdx]?.id, 'iran-world-void', 'world void must be topmost');
    assert.ok(style.layers?.some((l) => l.id === 'landcover'), 'landcover required for national zoom');
    assert.ok(style.layers?.some((l) => l.id === 'land'), 'land layer required for national zoom');
    assert.ok(style.layers?.some((l) => l.id === 'water'), 'water layer required for national seas');
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

  const darkBg = dark.layers?.find((l) => l.id === 'background');
  const lightBg = light.layers?.find((l) => l.id === 'background');
  assert.ok(darkBg && 'paint' in darkBg && darkBg.paint?.['background-color'] === '#181b22');
  assert.ok(lightBg && 'paint' in lightBg && lightBg.paint?.['background-color'] === '#e8ecf2');

  assert.equal(isFatalIranVectorMapError(new Error('Failed to load style')), true);
  assert.equal(isFatalIranVectorMapError(new Error('glyph loading failed')), false);
  assert.equal(isFatalIranVectorMapError(new Error('tile fetch 404')), false);

  console.log('[ok] map style regression self-test');
}

run();
