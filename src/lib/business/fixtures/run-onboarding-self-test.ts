/**
 * Zod + onboarding helper self-test.
 * Run: npx --yes tsx src/lib/business/fixtures/run-onboarding-self-test.ts
 */
import {
  businessOnboardingPayloadSchema,
  businessOnboardingStep1Schema,
  businessOnboardingStep2Schema,
  businessOnboardingStep3Schema,
} from '../onboarding-schema';
import { hasCompletedOnboarding, needsOnboarding, isProfileSubstantivelyComplete } from '../onboarding';
import {
  buildBusinessSeoDescription,
  buildBusinessSeoTitle,
  isGenericBusinessName,
  resolveBusinessDisplayName,
  suggestBusinessDisplayName,
} from '../suggest-display-name';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

// Step 1 rejects short name
const s1bad = businessOnboardingStep1Schema.safeParse({
  name: 'ا',
  occupationSlugs: ['not-a-slug'],
});
assert(!s1bad.success, 'step1 should reject invalid input');

// Step 2 normalizes phone
const s2 = businessOnboardingStep2Schema.safeParse({
  phone: '9123456789',
  whatsapp: '',
  email: '',
});
assert(s2.success && s2.data.phone === '09123456789', 'phone should normalize to 09...');

// Full payload with real category (plumbing or first depth>=1)
const slug = 'plumber';
const full = businessOnboardingPayloadSchema.safeParse({
  name: 'تعمیرات تست',
  occupationSlugs: [slug, 'electrician'],
  description: '',
  phone: '09121234567',
  whatsapp: '',
  email: '',
  city: 'مشهد',
  province: 'خراسان رضوی',
  address: '',
  logo: '',
  coverImage: '',
  website: '',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
});
assert(full.success, `full payload should pass for slug ${slug}`);

const withWebsite = businessOnboardingStep3Schema.safeParse({
  logo: '',
  coverImage: '',
  website: 'www.tizkharid.com',
  instagram: '@shop',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
});
assert(
  withWebsite.success &&
    withWebsite.data.website === 'https://www.tizkharid.com' &&
    withWebsite.data.instagram === 'https://instagram.com/shop',
  'step3 normalizes website and instagram'
);

const mixed = businessOnboardingPayloadSchema.safeParse({
  name: 'بدلیجات گل‌رز',
  occupationSlugs: ['online-costume-jewelry', 'plumber'],
  description: '',
  phone: '09121234567',
  whatsapp: '',
  email: '',
  city: 'تهران',
  province: '',
  address: '',
  logo: '',
  coverImage: '',
  website: '',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
});
assert(mixed.success, 'mixed online store + occupation slugs should pass');

const onlineOnly = businessOnboardingPayloadSchema.safeParse({
  name: 'فروشگاه آنلاین تست',
  occupationSlugs: ['online-costume-jewelry'],
  description: '',
  phone: '09121234567',
  whatsapp: '',
  email: '',
  city: '',
  province: '',
  address: '',
  logo: '',
  coverImage: '',
  website: 'tizkharid.com',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
});
assert(onlineOnly.success, 'online-only slug should pass step1');

assert(isGenericBusinessName('کسب‌وکار'), 'generic name detected');
assert(isGenericBusinessName(''), 'empty name is generic');

const suggested = suggestBusinessDisplayName({
  primaryOccupationSlug: 'plumber',
  personName: 'احمد',
  city: 'مشهد',
});
assert(suggested.includes('لوله‌کش') && suggested.includes('مشهد'), 'suggest includes job and city');

const resolved = resolveBusinessDisplayName('کسب‌وکار', {
  primaryOccupationSlug: 'plumber',
  personName: 'احمد',
  city: 'تهران',
});
assert(resolved.includes('لوله‌کش'), 'resolve replaces generic name');

const seoTitle = buildBusinessSeoTitle({
  name: resolved,
  primaryOccupationSlug: 'plumber',
  city: 'تهران',
});
assert(seoTitle.length > 0 && seoTitle.length <= 120, 'seo title length');

const seoDesc = buildBusinessSeoDescription({
  name: resolved,
  primaryOccupationSlug: 'plumber',
  city: 'تهران',
  description: '',
});
assert(seoDesc.includes('لوله‌کش') && seoDesc.length <= 160, 'auto seo description');

const onlineSuggested = suggestBusinessDisplayName({
  primaryOccupationSlug: 'online-costume-jewelry',
  city: 'تهران',
});
assert(
  onlineSuggested.includes('فروشگاه اینترنتی') && onlineSuggested.includes('بدلیجات'),
  'online store SEO segment'
);

// Helpers
assert(
  hasCompletedOnboarding({ onboardingCompletedAt: new Date() }),
  'hasCompletedOnboarding true when date set'
);
assert(
  !hasCompletedOnboarding({ onboardingCompletedAt: null }),
  'hasCompletedOnboarding false when null'
);
assert(
  isProfileSubstantivelyComplete({
    onboardingCompletedAt: null,
    name: 'شرکت الف',
    phone: '09121234567',
    categorySlugs: '["plumber"]',
  }),
  'substantive complete heuristic'
);
assert(
  needsOnboarding({
    onboardingCompletedAt: null,
    name: 'کسب‌وکار',
    phone: '',
    categorySlugs: '[]',
  }),
  'needs onboarding for empty profile'
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: business onboarding self-test passed');
