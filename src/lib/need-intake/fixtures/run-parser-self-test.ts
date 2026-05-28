import { resolveCategorySlugFromLegacy } from '@/lib/need-intake/intent-parser';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { PARSER_FIXTURES, type ParserFixture } from './parser-cases';

const LEGACY_SLUG_CASES: { value: string; expected: string }[] = [
  { value: 'real-estate-real-estate-services-agency', expected: 'agency-services' },
  { value: 'real-estate-real-estate-services-pre-sale', expected: 'pre-sale-services' },
  { value: 'real-estate-real-estate-services-agency-services', expected: 'agency-services' },
  { value: 'electronics-mobile-tablet-mobile-phone', expected: 'mobile-phone' },
];

function assertFixture(f: ParserFixture): string | null {
  const r = parseFromText(f.text);
  const categoryHaystack = [r.categorySlug, r.subcategorySlug].filter(Boolean).join(' ');

  if (f.expectIntentPrefix && !r.intentType.startsWith(f.expectIntentPrefix)) {
    return `${f.id}: intent ${r.intentType} expected prefix ${f.expectIntentPrefix}`;
  }
  if (f.expectCategoryIncludes && !categoryHaystack.includes(f.expectCategoryIncludes)) {
    return `${f.id}: category ${categoryHaystack} expected includes ${f.expectCategoryIncludes}`;
  }
  if (f.expectDealType && r.entities.dealType !== f.expectDealType) {
    return `${f.id}: dealType ${r.entities.dealType} expected ${f.expectDealType}`;
  }
  if (f.expectCity && r.city !== f.expectCity) {
    return `${f.id}: city ${r.city} expected ${f.expectCity}`;
  }
  if (f.expectLocationAmbiguous != null && Boolean(r.locationAmbiguous) !== f.expectLocationAmbiguous) {
    return `${f.id}: locationAmbiguous ${r.locationAmbiguous} expected ${f.expectLocationAmbiguous}`;
  }
  if (f.expectMinNeighborhoodCandidates != null) {
    const n = r.neighborhoodCandidates?.length ?? 0;
    if (n < f.expectMinNeighborhoodCandidates) {
      return `${f.id}: neighborhoodCandidates ${n} expected >= ${f.expectMinNeighborhoodCandidates}`;
    }
  }
  return null;
}

function assertLegacyMaps(): string[] {
  const failed: string[] = [];
  for (const { value, expected } of LEGACY_SLUG_CASES) {
    const got = resolveCategorySlugFromLegacy(value);
    if (got !== expected) {
      failed.push(`legacy ${value}: got ${got} expected ${expected}`);
    }
  }
  return failed;
}

export function runParserSelfTest(): { passed: number; failed: string[] } {
  const failed: string[] = [];
  for (const f of PARSER_FIXTURES) {
    const err = assertFixture(f);
    if (err) failed.push(err);
  }
  failed.push(...assertLegacyMaps());
  return { passed: PARSER_FIXTURES.length + LEGACY_SLUG_CASES.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-parser-self-test'));

if (isDirectRun) {
  const { passed, failed } = runParserSelfTest();
  if (failed.length) {
    console.error('Parser fixtures FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
    console.log(`Parser fixtures OK: ${passed}/${PARSER_FIXTURES.length + LEGACY_SLUG_CASES.length}`);
}
