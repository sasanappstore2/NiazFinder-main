import assert from 'node:assert/strict';
import {
  IRAN_VECTOR_TILE_MIN_ZOOM,
  IRAN_VECTOR_TILE_MAX_ZOOM,
  listIranVectorTileIndices,
  tileIntersectsIranVector,
} from '@/lib/map/iran/vector-bounds';
import { buildIranVectorTilejson } from '@/lib/map/iran/vector-tile-proxy.server';
import { buildIranDivarStyle } from '@/lib/map/iran/divar-style';
import { resolveIranDivarBrowseConfig } from '@/lib/map/iran/divar-browse-config';
import { resolveCityMapMinZoom, resolveViewportCitySlug } from '@/lib/map/city-map-config';

function run(): void {
  assert.equal(IRAN_VECTOR_TILE_MIN_ZOOM, 5);
  assert.equal(IRAN_VECTOR_TILE_MAX_ZOOM, 14);

  const national = listIranVectorTileIndices(5, 10);
  assert.ok(national.length > 4000 && national.length < 6000);

  assert.ok(tileIntersectsIranVector(11, 1318, 806));
  assert.ok(!tileIntersectsIranVector(4, 0, 0));

  const tilejson = buildIranVectorTilejson('http://localhost:3000');
  assert.equal(tilejson.minzoom, 5);
  assert.ok(tilejson.tiles[0]?.includes('/api/map/vector/iran/'));
  const layerIds = tilejson.vector_layers.map((layer) => layer.id);
  for (const id of ['landcover', 'boundary', 'place', 'waterway', 'water_name']) {
    assert.ok(layerIds.includes(id), `tilejson missing vector layer: ${id}`);
  }

  const darkStyle = buildIranDivarStyle('dark');
  const lightStyle = buildIranDivarStyle('light');
  assert.equal(darkStyle.name, 'niazfinder-iran-divar');
  assert.equal(lightStyle.name, 'niazfinder-iran-divar-light');
  assert.ok(String(darkStyle.glyphs).includes('/api/map/glyphs/'));
  const darkBg = darkStyle.layers?.find((layer) => layer.id === 'background');
  const lightBg = lightStyle.layers?.find((layer) => layer.id === 'background');
  assert.ok(darkBg && 'paint' in darkBg && darkBg.paint?.['background-color'] === '#181b22');
  assert.ok(lightBg && 'paint' in lightBg && lightBg.paint?.['background-color'] === '#e8ecf2');
  const source = darkStyle.sources?.openmaptiles;
  assert.ok(
    source &&
      'tiles' in source &&
      source.tiles?.[0]?.includes('/api/map/vector/iran/{z}/{x}/{y}.pbf')
  );
  assert.ok(!darkStyle.layers?.some((layer) => layer.id === 'iran-void-mask'));
  assert.ok(!darkStyle.sources?.['iran-void-mask']);
  assert.ok(darkStyle.layers?.some((layer) => layer.id === 'land'));
  assert.ok(darkStyle.layers?.some((layer) => layer.id === 'boundary-province'));

  const mashhad = resolveIranDivarBrowseConfig(['mashhad']);
  assert.ok(mashhad.minZoom >= resolveCityMapMinZoom('mashhad') - 0.5);
  assert.equal(mashhad.scopeKind, 'city');
  const shahriar = resolveIranDivarBrowseConfig(['shahriar']);
  assert.equal(resolveViewportCitySlug('shahriar'), 'shahriar');
  assert.ok(shahriar.viewportBounds);
  assert.equal(shahriar.minZoom, resolveCityMapMinZoom('shahriar'));
  const iran = resolveIranDivarBrowseConfig([]);
  assert.equal(iran.minZoom, 5);
  assert.equal(iran.scopeKind, 'national');
  const sistan = resolveIranDivarBrowseConfig([], ['sistan-baluchestan']);
  assert.equal(sistan.scopeKind, 'province');
  assert.ok(sistan.viewportBounds);

  console.log('[ok] iran vector tiles self-test');
}

run();
