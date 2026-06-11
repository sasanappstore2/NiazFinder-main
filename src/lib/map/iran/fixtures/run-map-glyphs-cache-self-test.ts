import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { resolveMapGlyph } from '@/lib/map/iran/vector-tile-proxy.server';

const SAMPLE = path.join(
  process.cwd(),
  'data',
  'map-vector-cache',
  'glyphs',
  'Noto Sans Regular',
  '0-255.pbf'
);

async function run(): Promise<void> {
  try {
    await access(SAMPLE);
  } catch {
    console.log('[skip] map glyphs cache self-test ? no local glyph at', SAMPLE);
    console.log('       run: npm run map:prewarm-iran');
    return;
  }

  const result = await resolveMapGlyph('Noto Sans Regular', '0-255');
  assert.ok(result, 'glyph should resolve');
  assert.equal(result.cache, 'hit', 'prewarmed glyph should be cache hit');
  assert.ok(result.body.byteLength > 100, 'glyph body should have content');

  console.log('[ok] map glyphs cache self-test', {
    bytes: result.body.byteLength,
    cache: result.cache,
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
