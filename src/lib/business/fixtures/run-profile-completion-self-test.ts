/**
 * Profile completion checklist self-test.
 * Run: npx --yes tsx src/lib/business/fixtures/run-profile-completion-self-test.ts
 */
import { computeBusinessProfileCompletion } from '../profile-completion';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const empty = computeBusinessProfileCompletion({
  name: '',
  categorySlugs: [],
  description: '',
  logo: '',
  coverImage: '',
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
  offerCount: 0,
  portfolioCount: 0,
});

assert(empty.percent === 0, 'empty profile should be 0%');
assert(empty.nextTaskId === 'profile', 'first incomplete should be name -> profile');

const partial = computeBusinessProfileCompletion({
  name: 'فروشگاه تست',
  categorySlugs: ['online-fashion'],
  description: 'توضیح کوتاه',
  logo: '',
  coverImage: '',
  phone: '09121234567',
  whatsapp: '',
  website: '',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
  offerCount: 0,
  portfolioCount: 0,
});

assert(partial.percent > 0 && partial.percent < 100, 'partial should be between 0 and 100');
assert(
  partial.items.find((i) => i.id === 'description')?.completed === false,
  'short description should not complete'
);

const fullish = computeBusinessProfileCompletion({
  name: 'فروشگاه تست',
  categorySlugs: ['online-fashion'],
  description: 'این یک معرفی کافی برای پروفایل کسب‌وکار است که حداقل بیست کاراکتر دارد.',
  logo: '/uploads/business/x/logo.png',
  coverImage: '',
  phone: '09121234567',
  whatsapp: '',
  website: 'https://example.com',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
  offerCount: 1,
  portfolioCount: 0,
});

assert(fullish.percent === 100, 'all items complete should be 100%');
assert(fullish.nextTaskId === null, 'no next task when complete');

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('profile-completion self-test: OK');
