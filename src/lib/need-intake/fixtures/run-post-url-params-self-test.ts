/**
 * Post URL param resolution — city slug + category slug.
 * Run: npm run test:post-url-params
 */
import { normalizeCategoryPair } from '@/config/categories';
import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';
import { resolveIntakeCitySelectValue } from '@/lib/need-intake/sync-intake-location-form';
import { inferEntitiesFromCategorySlugs } from '@/intake/aggregate/needDraftAggregate';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const managedCities = ALL_LOCATION_CITIES.map((c) => ({
  id: c.id,
  name: c.name,
  nameEn: c.nameEn,
}));

const mashhad = resolveIntakeCitySelectValue(managedCities, {
  citySlug: 'mashhad',
});
assert(mashhad === 'مشهد', `city slug mashhad → ${mashhad}`);

const normalized = normalizeCategoryPair('apartment-rent');
assert(normalized.subcategorySlug === 'apartment-rent', 'leaf slug');
assert(
  normalized.categorySlug === 'residential-rent' || normalized.categorySlug === 'real-estate',
  `category parent: ${normalized.categorySlug}`
);

const entities = inferEntitiesFromCategorySlugs(
  normalized.categorySlug,
  normalized.subcategorySlug
);
assert(entities.subcategorySlug === 'apartment-rent', 'entity leaf');

console.log('post-url-params self-test: OK');
