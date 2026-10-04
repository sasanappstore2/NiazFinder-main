import {
  buildHomeToPostSearchParams,
  homeToPostQueryKey,
  inferCategorySlugFromSeed,
} from '@/lib/need-intake/home-post-seamless';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const seed = 'یک آپارتمان ۸۰ متری برای خرید در ونک می‌خواهم';
const params = buildHomeToPostSearchParams({ seed: `  ${seed}  `, citySlug: 'tehran' });
assert(params.get('seed') === seed, 'home seed should be trimmed and preserved');
assert(params.get('city') === 'tehran', 'the selected single city should be carried to /post');
assert(
  params.get('category') === inferCategorySlugFromSeed(seed),
  'the inferred category should be included in the home-to-post URL'
);

const noCityParams = buildHomeToPostSearchParams({ seed });
assert(!noCityParams.has('city'), 'missing city must not be fabricated in the /post URL');
assert(
  homeToPostQueryKey({ seed, city: 'tehran' }) !== homeToPostQueryKey({ seed }),
  'analysis cache keys must distinguish city context'
);

console.log('home-post-seamless self-test OK');
