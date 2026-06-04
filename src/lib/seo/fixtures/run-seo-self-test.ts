/**
 * Run: npx --yes tsx src/lib/seo/fixtures/run-seo-self-test.ts
 */
import { buildProductOfferJsonLd } from '@/lib/seo/business-json-ld';
import { buildServiceRequestJsonLd } from '@/lib/seo/service-request-json-ld';
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

const product = buildProductOfferJsonLd(
  {
    id: 'p1',
    slug: 'shop',
    name: 'Shop',
    userId: 'u1',
    seo: { title: 't', description: 'd', keywords: [] },
    identity: { description: 'd', category: [], tags: [], location: { city: 'Tehran' }, status: 'active' },
    trust: { rating: 5, reviewCount: 1, verified: true, badges: [], responseRate: 1, yearsActive: 1 },
    contact: { chatEnabled: true },
    offers: [],
    portfolio: [],
    reviews: [],
    analytics: { views: 0, clicks: 0, conversions: 0, saves: 0 },
  } as never,
  {
    id: 'o1',
    title: 'Offer',
    description: 'Desc',
    images: [],
    features: [],
    ctaType: 'chat',
  }
);
assert(product['@type'] === 'Product', 'product json-ld type');

const service = buildServiceRequestJsonLd({
  id: 'r1',
  title: 'Need title',
  description: 'Need body',
  createdAt: new Date().toISOString(),
});
assert(service['@type'] === 'Service', 'service json-ld type');

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
