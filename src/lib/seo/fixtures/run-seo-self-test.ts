/**
 * Run: npx --yes tsx src/lib/seo/fixtures/run-seo-self-test.ts
 */
import { generateFullSitemap, SITEMAP_STATIC_URLS } from '@/lib/seo/sitemap';
import { resolveBrowseSeoBlock } from '@/content/seo/browse-seo-content';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import { SITE_DESCRIPTION } from '@/lib/seo/index';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const staticEntries = generateFullSitemap();
assert(staticEntries.length > SITEMAP_STATIC_URLS.length, 'full sitemap includes cities');

const browse = resolveBrowseSeoBlock('need', 'iran');
assert(Boolean(browse?.paragraphs.length), 'browse seo block');

assert(slugifyBlogTitle('سلام دنیا!') === 'سلام-دنیا', 'blog slug');

assert(!SITE_DESCRIPTION.includes('۵۰ تخصص'), 'site description softened');

if (failed === 0) {
  console.log('OK: seo self-test passed');
} else {
  process.exit(1);
}
