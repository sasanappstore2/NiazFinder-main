/**
 * Smoke-test local map APIs (requires Next.js on :3000).
 * Run: npm run smoke:map
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type Check = {
  name: string;
  path: string;
  minBytes?: number;
};

const CHECKS: Check[] = [
  {
    name: 'vector_tile',
    path: '/api/map/vector/iran/5/20/12',
    minBytes: 100_000,
  },
  {
    name: 'glyph',
    path: '/api/map/glyphs/Noto%20Sans%20Regular/0-255.pbf',
    minBytes: 1000,
  },
  {
    name: 'raster_tile',
    path: '/api/map/tiles/12/2627/1600?theme=dark',
    minBytes: 100,
  },
  { name: 'need_map_page', path: '/b/iran?type=need&view=map' },
  { name: 'business_map_page', path: '/b/iran?type=business&view=map' },
  { name: 'post_page', path: '/post' },
];

async function runCheck(c: Check) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${c.path}`, { signal: AbortSignal.timeout(30_000) });
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength;
    const ok =
      res.status === 200 &&
      (c.minBytes == null || bytes >= c.minBytes);
    return {
      name: c.name,
      path: c.path,
      status: res.status,
      bytes,
      ok,
      ms: Date.now() - start,
    };
  } catch (e) {
    return {
      name: c.name,
      path: c.path,
      status: 0,
      bytes: 0,
      ok: false,
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  console.log(`=== smoke:map (${BASE}) ===`);
  const results = [];
  for (const c of CHECKS) {
    results.push(await runCheck(c));
  }
  let failed = 0;
  for (const r of results) {
    const tag = r.ok ? 'ok' : 'FAIL';
    const extra =
      'error' in r && r.error ? ` err=${r.error}` : ` ${r.bytes}B ${r.ms}ms`;
    console.log(`[${tag}] ${r.name} ${r.status}${extra}`);
    if (!r.ok) failed += 1;
  }
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed. Is Next.js running? npm run dev`);
    process.exit(1);
  }
  console.log('\n[smoke:map] all checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
