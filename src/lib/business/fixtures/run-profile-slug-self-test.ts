/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-profile-slug-self-test.ts
 */
import {
  generateRandomBusinessSlug,
  sanitizeBusinessProfileSlug,
  suggestProfileSlugFromWebPresence,
  validateBusinessProfileSlug,
} from '../profile-slug';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const random = generateRandomBusinessSlug();
assert(/^[a-z0-9]{9}$/.test(random), 'random slug is 9 alphanumeric');

assert(sanitizeBusinessProfileSlug('TizKharid') === 'tizkharid', 'lowercase');
assert(sanitizeBusinessProfileSlug('@My_Shop!') === 'my_shop', 'strip @ and specials');
assert(sanitizeBusinessProfileSlug('فروشگاه') === '', 'strip persian');

assert(validateBusinessProfileSlug('ab').ok === false, 'too short');
assert(validateBusinessProfileSlug('fnjekwnkv').ok === true, 'valid random style');

const suggested = suggestProfileSlugFromWebPresence({
  instagram: 'https://instagram.com/my_shop',
  telegram: '',
});
assert(suggested === 'my_shop', 'suggest from instagram');

if (failed === 0) {
  console.log('OK: profile slug self-test passed');
} else {
  process.exit(1);
}
