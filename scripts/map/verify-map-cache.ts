/**
 * Verify local map tile caches on disk (no network).
 * Run: npm run map:verify-cache
 */
import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const VECTOR_IRAN = path.join(ROOT, 'data', 'map-vector-cache', 'iran');
const GLYPHS = path.join(ROOT, 'data', 'map-vector-cache', 'glyphs');
const RASTER = path.join(ROOT, 'data', 'map-tiles-cache');

const MIN_VECTOR_TILES = 1000;
const MIN_RASTER_TILES = 100;
const MIN_TILE_BYTES = 1024;
const SAMPLE_VECTOR = path.join(VECTOR_IRAN, '5', '20', '12.pbf');
const SAMPLE_GLYPH = path.join(GLYPHS, 'Noto Sans Regular', '0-255.pbf');

type Level = 'ok' | 'warn' | 'fail';

async function countPbfFiles(dir: string): Promise<number> {
  let count = 0;
  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.pbf')) count += 1;
    }
  }
  await walk(dir);
  return count;
}

async function countPngFiles(dir: string): Promise<number> {
  let count = 0;
  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.png')) count += 1;
    }
  }
  await walk(dir);
  return count;
}

async function fileSize(file: string): Promise<number | null> {
  try {
    const s = await stat(file);
    return s.size;
  } catch {
    return null;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const results: Array<{ name: string; level: Level; detail: string }> = [];

  const vectorCount = await countPbfFiles(VECTOR_IRAN);
  if (vectorCount >= MIN_VECTOR_TILES) {
    results.push({
      name: 'vector-tiles',
      level: 'ok',
      detail: `${vectorCount} .pbf files in data/map-vector-cache/iran`,
    });
  } else if (vectorCount > 0) {
    results.push({
      name: 'vector-tiles',
      level: 'warn',
      detail: `only ${vectorCount} tiles (need >= ${MIN_VECTOR_TILES})`,
    });
  } else {
    results.push({
      name: 'vector-tiles',
      level: 'fail',
      detail: 'no vector tiles ? run: npm run map:prewarm-iran',
    });
  }

  const sampleSize = await fileSize(SAMPLE_VECTOR);
  if (sampleSize != null && sampleSize >= MIN_TILE_BYTES) {
    results.push({
      name: 'sample-vector-tile',
      level: 'ok',
      detail: `5/20/12.pbf = ${sampleSize} bytes`,
    });
  } else {
    results.push({
      name: 'sample-vector-tile',
      level: 'fail',
      detail: `missing or tiny sample tile at ${SAMPLE_VECTOR}`,
    });
  }

  const glyphOk = await exists(SAMPLE_GLYPH);
  const glyphSize = glyphOk ? await fileSize(SAMPLE_GLYPH) : null;
  if (glyphSize != null && glyphSize >= MIN_TILE_BYTES) {
    results.push({
      name: 'glyphs',
      level: 'ok',
      detail: `Noto Sans Regular/0-255.pbf = ${glyphSize} bytes`,
    });
  } else {
    results.push({
      name: 'glyphs',
      level: 'warn',
      detail: 'glyph cache incomplete ? run: npm run map:prewarm-iran',
    });
  }

  const rasterCount = await countPngFiles(RASTER);
  if (rasterCount >= MIN_RASTER_TILES) {
    results.push({
      name: 'raster-tiles',
      level: 'ok',
      detail: `${rasterCount} PNG files in data/map-tiles-cache`,
    });
  } else if (rasterCount > 0) {
    results.push({
      name: 'raster-tiles',
      level: 'warn',
      detail: `only ${rasterCount} raster tiles (optional fallback cache)`,
    });
  } else {
    results.push({
      name: 'raster-tiles',
      level: 'warn',
      detail: 'no raster cache (OK ? fills on first browse via /api/map/tiles)',
    });
  }

  let hasFail = false;
  let hasWarn = false;
  console.log('=== map cache verify ===');
  for (const r of results) {
    const tag = r.level === 'ok' ? '[ok]' : r.level === 'warn' ? '[warn]' : '[FAIL]';
    console.log(`${tag} ${r.name}: ${r.detail}`);
    if (r.level === 'fail') hasFail = true;
    if (r.level === 'warn') hasWarn = true;
  }

  if (hasFail) {
    console.log('\nFix: npm run map:prewarm-iran');
    console.log('Docs: docs/MAP_LOCAL_SETUP.md');
    process.exit(1);
  }
  if (hasWarn) {
    console.log('\n[map:verify-cache] passed with warnings');
  } else {
    console.log('\n[map:verify-cache] all checks passed');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
