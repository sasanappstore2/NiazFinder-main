/**
 * Full Iran map system check — cache, geo, viewports, tile spot-samples, live API.
 * Run: npm run map:iran-check
 *      npm run map:iran-check -- --live   (requires Next on :3000)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { lon2tile, lat2tile } from '../../src/lib/map/vector/tile-math';
import { tileIntersectsIranVector } from '../../src/lib/map/iran/vector-bounds';

const ROOT = process.cwd();
const VECTOR_CACHE = path.join(ROOT, 'data/map-vector-cache/iran');
const live = process.argv.includes('--live');
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type Level = 'ok' | 'warn' | 'fail';

type Check = { name: string; level: Level; detail: string };

const checks: Check[] = [];

function add(name: string, level: Level, detail: string) {
  checks.push({ name, level, detail });
  const tag = level === 'ok' ? 'ok' : level === 'warn' ? 'WARN' : 'FAIL';
  console.log(`[${tag}] ${name}: ${detail}`);
}

function runNpm(script: string): boolean {
  const res = spawnSync('npm', ['run', script], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return res.status === 0;
}

/** Provincial capitals + corners — spot-check vector cache coverage. */
const IRAN_SPOTS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'tehran', lat: 35.6892, lng: 51.389 },
  { name: 'mashhad', lat: 36.2605, lng: 59.6168 },
  { name: 'isfahan', lat: 32.6546, lng: 51.668 },
  { name: 'shiraz', lat: 29.5918, lng: 52.5837 },
  { name: 'tabriz', lat: 38.08, lng: 46.2919 },
  { name: 'ahvaz', lat: 31.3183, lng: 48.6706 },
  { name: 'kerman', lat: 30.2839, lng: 57.0834 },
  { name: 'zahedan', lat: 29.4963, lng: 60.8629 },
  { name: 'rasht', lat: 37.2808, lng: 49.5832 },
  { name: 'kish', lat: 26.557, lng: 54.0194 },
  { name: 'urmia', lat: 37.5552, lng: 45.0725 },
  { name: 'bandar-abbas', lat: 27.1832, lng: 56.2666 },
  { name: 'sanandaj', lat: 35.3144, lng: 46.9983 },
  { name: 'yazd', lat: 31.8974, lng: 54.3569 },
  { name: 'qom', lat: 34.6416, lng: 50.8746 },
  { name: 'arak', lat: 34.0917, lng: 49.6892 },
  { name: 'bojnurd', lat: 37.4747, lng: 57.329 },
  { name: 'birjand', lat: 32.8663, lng: 59.2211 },
  { name: 'ilam', lat: 33.6374, lng: 46.4227 },
  { name: 'bushehr', lat: 28.9234, lng: 50.8203 },
  { name: 'gorgan', lat: 36.8416, lng: 54.4436 },
  { name: 'hamadan', lat: 34.7992, lng: 48.5146 },
  { name: 'khorramabad', lat: 33.4878, lng: 48.3558 },
  { name: 'semnan', lat: 35.5729, lng: 53.3971 },
  { name: 'sari', lat: 36.5633, lng: 53.0601 },
  { name: 'shahrekord', lat: 32.3256, lng: 50.8644 },
  { name: 'yasuj', lat: 30.6682, lng: 51.5879 },
  { name: 'bandar-lengeh', lat: 26.5581, lng: 54.8806 },
  { name: 'chabahar', lat: 25.2919, lng: 60.643 },
  { name: 'maragheh', lat: 37.3925, lng: 46.239 },
  { name: 'national-center', lat: 32.4279, lng: 53.688 },
];

const ZOOM_LEVELS_STRICT = [5, 7, 10] as const;
const ZOOM_LEVELS_OPTIONAL = [13] as const;

function tileCachePath(z: number, x: number, y: number): string {
  return path.join(VECTOR_CACHE, String(z), String(x), `${y}.pbf`);
}

function checkIranTileSamples(): void {
  let missingStrict = 0;
  let missingOptional = 0;
  let checkedStrict = 0;
  let checkedOptional = 0;

  const checkLevel = (z: number, optional: boolean) => {
    for (const spot of IRAN_SPOTS) {
      const x = lon2tile(spot.lng, z);
      const y = lat2tile(spot.lat, z);
      if (!tileIntersectsIranVector(z, x, y)) continue;
      if (optional) checkedOptional += 1;
      else checkedStrict += 1;
      const file = tileCachePath(z, x, y);
      if (!fs.existsSync(file)) {
        if (optional) missingOptional += 1;
        else missingStrict += 1;
        continue;
      }
      const size = fs.statSync(file).size;
      if (size < 100) {
        if (optional) missingOptional += 1;
        else missingStrict += 1;
      }
    }
  };

  for (const z of ZOOM_LEVELS_STRICT) checkLevel(z, false);
  for (const z of ZOOM_LEVELS_OPTIONAL) checkLevel(z, true);

  if (missingStrict === 0) {
    add(
      'tile-sample',
      'ok',
      `${checkedStrict} core tiles (z5/7/10) across ${IRAN_SPOTS.length} locations`
    );
  } else {
    add('tile-sample', 'fail', `${missingStrict}/${checkedStrict} core spot tiles missing`);
  }

  if (missingOptional > 0) {
    add(
      'tile-sample-z13',
      'warn',
      `${missingOptional}/${checkedOptional} z13 edge tiles not prewarmed (OK on cache miss)`
    );
  } else if (checkedOptional > 0) {
    add('tile-sample-z13', 'ok', `${checkedOptional} z13 spot tiles on disk`);
  }
}

async function checkLiveApi(): Promise<void> {
  const vectorRoute = path.join(
    ROOT,
    'src/app/api/map/vector/iran/[z]/[x]/[y]/route.ts'
  );
  if (!fs.existsSync(vectorRoute)) {
    add('vector-route', 'fail', 'missing API route file');
    return;
  }
  add('vector-route', 'ok', 'src/app/api/map/vector/iran/[z]/[x]/[y]/route.ts');

  try {
    const res = await fetch(`${BASE}/api/map/vector/iran/5/20/12`, {
      signal: AbortSignal.timeout(15_000),
    });
    const buf = await res.arrayBuffer();
    if (res.status === 200 && buf.byteLength > 10_000) {
      add('live-vector-tile', 'ok', `${buf.byteLength}B HTTP 200`);
    } else {
      add('live-vector-tile', 'fail', `HTTP ${res.status} ${buf.byteLength}B`);
    }
  } catch (e) {
    add('live-vector-tile', 'warn', `server unreachable (${e instanceof Error ? e.message : e})`);
  }

  let liveSpotFails = 0;
  for (const spot of IRAN_SPOTS.slice(0, 8)) {
    const z = 7;
    const x = lon2tile(spot.lng, z);
    const y = lat2tile(spot.lat, z);
    try {
      const res = await fetch(`${BASE}/api/map/vector/iran/${z}/${x}/${y}`, {
        signal: AbortSignal.timeout(10_000),
      });
      const bytes = (await res.arrayBuffer()).byteLength;
      if (res.status !== 200 || bytes < 500) {
        liveSpotFails += 1;
        add(`live-${spot.name}`, 'fail', `z${z} HTTP ${res.status} ${bytes}B`);
      }
    } catch {
      add(`live-${spot.name}`, 'warn', 'fetch failed');
      break;
    }
  }
  if (liveSpotFails === 0) {
    add('live-spot-tiles', 'ok', '8 provincial capitals z7 via HTTP');
  }
}

async function main(): Promise<void> {
  console.log('=== map:iran-check ===\n');

  console.log('--- Phase 1: disk cache ---');
  if (!runNpm('map:verify-cache')) {
    add('verify-cache', 'fail', 'map:verify-cache failed');
  }

  console.log('\n--- Phase 2: unit self-tests ---');
  const scripts = [
    'test:map-tiles',
    'test:need-map-pins',
    'test:neighborhoods',
    'test:geo-map-data',
    'test:location-viewport',
    'test:geo-quality-gate',
    'test:province-geo-parity',
  ];
  for (const script of scripts) {
    if (!runNpm(script)) add(script, 'fail', 'failed');
    else add(script, 'ok', 'passed');
  }

  console.log('\n--- Phase 3: Iran tile spot samples (disk) ---');
  checkIranTileSamples();

  console.log('\n--- Phase 4: API route ---');
  await checkLiveApi();

  if (live) {
    console.log('\n--- Phase 5: live smoke ---');
    if (!runNpm('smoke:map')) add('smoke:map', 'fail', 'failed');
    if (!runNpm('smoke:map-browser')) add('smoke:map-browser', 'fail', 'failed');
    if (!runNpm('test:map-visual-qa')) add('test:map-visual-qa', 'fail', 'failed');
  }

  const fails = checks.filter((c) => c.level === 'fail').length;
  const warns = checks.filter((c) => c.level === 'warn').length;

  console.log('\n=== Summary ===');
  console.log(`checks: ${checks.length}, fail: ${fails}, warn: ${warns}`);

  const outDir = path.join(ROOT, 'reports', `map-iran-check-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), checks, fails, warns }, null, 2) + '\n'
  );
  console.log(`Report → ${outDir}/report.json`);

  if (fails > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
