import assert from 'node:assert/strict';
import {
  isValidMapTilePng,
  resolveIranMapTile,
} from '@/lib/business/map-tile-proxy.server';

async function run(): Promise<void> {
  const light = await resolveIranMapTile(12, 2627, 1600, 'light');
  assert.ok(isValidMapTilePng(light.body), 'light tile should be a valid PNG');
  assert.ok(light.body.byteLength > 1000, 'light tile should have real map content');
  assert.notEqual(light.cache, 'placeholder', 'light tile should not be placeholder');

  const dark = await resolveIranMapTile(12, 2627, 1600, 'dark');
  assert.ok(isValidMapTilePng(dark.body), 'dark tile should be a valid PNG');
  assert.ok(dark.body.byteLength > 1000, 'dark tile should have real map content');
  assert.notEqual(dark.cache, 'placeholder', 'dark tile should not be placeholder');

  console.log('[ok] map tile proxy self-test', {
    light: { bytes: light.body.byteLength, cache: light.cache },
    dark: { bytes: dark.body.byteLength, cache: dark.cache },
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
