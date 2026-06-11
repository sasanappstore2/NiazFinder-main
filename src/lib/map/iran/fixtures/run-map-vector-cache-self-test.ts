import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { resolveIranVectorTile } from '@/lib/map/iran/vector-tile-proxy.server';

const SAMPLE = path.join(process.cwd(), 'data', 'map-vector-cache', 'iran', '5', '20', '12.pbf');

async function run(): Promise<void> {
  try {
    await access(SAMPLE);
  } catch {
    console.log('[skip] map vector cache self-test ? no local cache at', SAMPLE);
    console.log('       run: npm run map:prewarm-iran');
    return;
  }

  const result = await resolveIranVectorTile(5, 20, 12);
  assert.ok(result, 'tile should resolve for Iran bounds');
  assert.equal(result.cache, 'hit', 'prewarmed tile should be cache hit');
  assert.ok(result.body.byteLength > 1000, 'tile body should have content');

  console.log('[ok] map vector cache self-test', {
    bytes: result.body.byteLength,
    cache: result.cache,
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
