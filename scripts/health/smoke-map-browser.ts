/**
 * Headless browser smoke ? vector tiles must load on browse map.
 * Run: npx tsx scripts/health/smoke-map-browser.ts
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

async function main() {
  const url = `${BASE}/b/iran?type=business&view=map`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const tileReqs: string[] = [];
  const tileFails: string[] = [];

  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/api/map/vector/iran/') || u.includes('/api/map/glyphs/')) {
      tileReqs.push(`${res.status()} ${u.split('/api/')[1] ?? u}`);
      if (!res.ok()) tileFails.push(u);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[browser error]', msg.text());
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('.iran-divar-map .maplibregl-canvas', { timeout: 30_000 });
  await page.waitForTimeout(5000);

  const canvasCount = await page.locator('.iran-divar-map .maplibregl-canvas').count();
  const mapState = await page.evaluate(() => {
    const canvas = document.querySelector('.iran-divar-map .maplibregl-canvas') as HTMLCanvasElement | null;
    const map = (canvas as unknown as { _map?: { getZoom: () => number; getCenter: () => { lng: number; lat: number }; getStyle: () => { sources?: Record<string, unknown> } } })?._map;
    if (!map) return { hasMap: false, canvasW: canvas?.width, canvasH: canvas?.height };
    const sources = map.getStyle()?.sources ?? {};
    return {
      hasMap: true,
      zoom: map.getZoom(),
      center: map.getCenter(),
      sourceKeys: Object.keys(sources),
      canvasW: canvas?.width,
      canvasH: canvas?.height,
    };
  });
  const okTiles = tileReqs.filter((r) => r.startsWith('200 ')).length;
  const vectorTiles = tileReqs.filter((r) => r.includes('map/vector/iran/')).length;

  console.log('=== smoke:map-browser ===');
  console.log(`canvas: ${canvasCount}`);
  console.log('map state:', JSON.stringify(mapState));
  console.log(`vector tile requests: ${vectorTiles}`);
  console.log(`vector/glyph 200 responses: ${okTiles} / ${tileReqs.length}`);
  if (tileReqs.length > 0) {
    console.log('sample:', tileReqs.slice(0, 6).join('\n  '));
  }
  if (tileFails.length > 0) {
    console.log('failed urls:', tileFails.slice(0, 5));
  }

  await browser.close();

  if (canvasCount < 1 || vectorTiles < 1) {
    console.log('\n[smoke:map-browser] FAIL ? vector tiles did not load');
    process.exit(1);
  }
  console.log('\n[smoke:map-browser] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
