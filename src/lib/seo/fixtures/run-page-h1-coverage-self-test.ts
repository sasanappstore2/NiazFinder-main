/**
 * Ensures static page title map covers sitemap routes.
 * Run: npx tsx src/lib/seo/fixtures/run-page-h1-coverage-self-test.ts
 */
import { SITEMAP_STATIC_URLS } from '@/lib/seo/sitemap';
import { getPageTitleForPath } from '@/config/page-titles';
import { canonicalMarketPath } from '@/config/market-routes';
import { CANONICAL_CITIES } from '@/config/locations';

const MARKETPLACE_SAMPLE = [
  canonicalMarketPath('need', 'tehran'),
  canonicalMarketPath('business', 'mashhad', ['real-estate']),
];

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

let ok = 0;

for (const item of SITEMAP_STATIC_URLS) {
  if (item.url.startsWith('/n/') || item.url.startsWith('/b/')) continue;
  const title = getPageTitleForPath(item.url);
  assert(Boolean(title), `missing page title for ${item.url}`);
  ok++;
}

for (const city of CANONICAL_CITIES.slice(0, 3)) {
  assert(getPageTitleForPath(`/n/${city.slug}`) === null, `marketplace should own h1: /n/${city.slug}`);
  ok++;
}

for (const path of MARKETPLACE_SAMPLE) {
  assert(getPageTitleForPath(path) === null, `marketplace should own h1: ${path}`);
  ok++;
}

console.log(`[ok] page-h1-coverage self-test (${ok} checks)`);
