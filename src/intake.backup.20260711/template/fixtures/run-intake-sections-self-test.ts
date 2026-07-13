/**
 * Self-test: every canonical category gets optional intake sections with Persian labels.
 * Run: npx tsx src/intake/template/fixtures/run-intake-sections-self-test.ts
 */
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { resolveTemplate } from '@/intake/template/resolveTemplate';

const MANDATORY_KEYS = new Set(['category', 'location', 'vehicle', 'service-type', 'deal']);

let failed = 0;

const slugs = CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).map((c) => c.slug);

for (const slug of slugs) {
  const template = resolveTemplate({ categorySlug: slug });
  const optionalSections = template.sections.filter(
    (s) =>
      s.key !== 'specs' &&
      !template.mandatorySectionKeys.has(s.key) &&
      s.fields.length > 0
  );

  if (optionalSections.length === 0) {
    console.error(`FAIL ${slug}: no optional sections with fields`);
    failed++;
    continue;
  }

  for (const section of optionalSections) {
    if (!section.label || section.label.length < 2) {
      console.error(`FAIL ${slug}: section ${section.key} missing Persian label`);
      failed++;
    }
    if (/[a-zA-Z]{4,}/.test(section.label)) {
      console.error(`FAIL ${slug}: section ${section.key} label looks English: ${section.label}`);
      failed++;
    }
  }

  const hasBudgetOrSpecs =
    optionalSections.some((s) => s.key === 'budget') ||
    optionalSections.some((s) =>
      [
        'product-specs',
        'property-specs',
        'vehicle-specs',
        'service-details',
        'job-details',
        'social-details',
        'deal',
        'job-type',
        'timing',
        'salary',
        'tech-specs',
      ].includes(s.key)
    );
  if (!hasBudgetOrSpecs && !MANDATORY_KEYS.has(slug)) {
    console.error(`FAIL ${slug}: no meaningful optional section (budget or specs)`);
    failed++;
  }
}

const musical = resolveTemplate({ categorySlug: 'musical-instruments' });
const musicalOptional = musical.sections.filter(
  (s) => s.key !== 'specs' && !musical.mandatorySectionKeys.has(s.key)
);
const musicalLabels = musicalOptional.map((s) => s.label);
if (!musicalLabels.some((l) => l.includes('ساز') || l.includes('کالا'))) {
  console.error('FAIL musical-instruments: expected مشخصات ساز or مشخصات کالا section');
  failed++;
}
const musicalFields = new Set(musical.sections.flatMap((s) => s.fields));
for (const key of ['dealType', 'condition', 'brand', 'budget']) {
  if (!musicalFields.has(key)) {
    console.error(`FAIL musical-instruments: missing intake field ${key}`);
    failed++;
  }
}

const carRide = resolveTemplate({ categorySlug: 'car-ride' });
const aptRent = resolveTemplate({ categorySlug: 'apartment-rent' });
if (aptRent.criticalFields.length < 2) {
  console.error('FAIL apartment-rent: expected criticalFields');
  failed++;
}
if (aptRent.criticalSectionKeys.size < 1) {
  console.error('FAIL apartment-rent: expected criticalSectionKeys auto-open');
  failed++;
}
const carOptional = carRide.sections.filter(
  (s) => s.key !== 'specs' && !carRide.mandatorySectionKeys.has(s.key) && s.fields.length > 0
);
if (!carOptional.some((s) => s.key === 'vehicle-specs' || s.label.includes('خودرو'))) {
  console.error('FAIL car-ride: expected vehicle specs section');
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log(`intake-sections self-test: OK (${slugs.length} categories)`);
