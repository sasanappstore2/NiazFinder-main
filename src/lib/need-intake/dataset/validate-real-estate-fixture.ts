import { getCategoryPath } from '@/config/categories';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { classifyVertical } from '@/lib/need-intake/vertical-classifier';
import type { DatasetFixture } from './schema';
import { normalizeInput } from './shared/normalize-input';

const VALID_INTENTS = new Set([
  'property_search',
  'property_listing',
  'real_estate_service',
]);

const NEED_OPENER_RE = /(می\s*خو(?:ام|اهم)|دنبال|نیاز دارم|به دنبال|لازم دارم)/;

export function isRealEstateCategorySlug(slug: string): boolean {
  const path = getCategoryPath(slug);
  return path[0]?.slug === 'real-estate';
}

/** Validate a single real-estate training row. Returns error messages (empty = healthy). */
export function validateRealEstateFixture(fixture: DatasetFixture): string[] {
  const errors: string[] = [];
  const input = fixture.input?.trim() ?? '';

  if (input.length < 12) errors.push('input too short');
  if (input.length > 2_500) errors.push('input too long');
  if (!/[\u0600-\u06FF]/.test(input)) errors.push('missing Persian script');
  if (/بروزرسانی|دانلود نسخه|تبلیغات/i.test(input)) errors.push('noise title');

  if (fixture.meta?.vertical && fixture.meta.vertical !== 'real-estate') {
    errors.push(`meta.vertical=${fixture.meta.vertical}`);
  }

  const intent = fixture.labels?.intentType;
  if (!intent || !VALID_INTENTS.has(intent)) {
    errors.push(`invalid intentType=${intent ?? 'missing'}`);
  }

  const cat = fixture.labels?.categorySlug;
  if (!cat || !isRealEstateCategorySlug(cat)) {
    errors.push(`categorySlug=${cat ?? 'missing'} not under real-estate`);
  }

  if (fixture.meta?.source === 'captured' && !NEED_OPENER_RE.test(input)) {
    errors.push('captured row missing need-seeker opener');
  }

  const parsed = parseIntentFromText(input);
  const classification = classifyVertical(input);

  const isDivarCaptured =
    fixture.meta?.source === 'captured' &&
    (fixture.meta?.tags?.includes('divar') ||
      fixture.meta?.tags?.includes('divar-api') ||
      fixture.meta?.tags?.includes('need-from-listing')) &&
    cat != null &&
    isRealEstateCategorySlug(cat);

  if (!isDivarCaptured) {
    if (classification.vertical !== 'real-estate') {
      errors.push(`classifier vertical=${classification.vertical}`);
    }

    if (parsed.confidence < 0.35) {
      errors.push(`parser confidence too low (${parsed.confidence})`);
    }

    const labelSlug = fixture.labels.categorySlug;
    const parsedHaystack = [parsed.categorySlug, parsed.subcategorySlug].filter(Boolean).join(' ');
    if (labelSlug && parsedHaystack && !parsedHaystack.includes(labelSlug.split('-')[0]!)) {
      const tagSlug = fixture.meta?.tags?.find((t) => isRealEstateCategorySlug(t));
      if (tagSlug && !parsedHaystack.includes(tagSlug.split('-')[0]!)) {
        errors.push(`parser category mismatch label=${labelSlug} parsed=${parsedHaystack}`);
      }
    }
  } else if (parsed.confidence < 0.15) {
    errors.push(`parser confidence too low (${parsed.confidence})`);
  }

  return errors;
}

export interface RealEstateBatchReport {
  total: number;
  healthy: number;
  rejected: number;
  rejectionReasons: Record<string, number>;
  sampleErrors: Array<{ id: string; errors: string[] }>;
}

export function validateRealEstateBatch(fixtures: DatasetFixture[]): {
  healthy: DatasetFixture[];
  report: RealEstateBatchReport;
} {
  const healthy: DatasetFixture[] = [];
  const rejectionReasons: Record<string, number> = {};
  const sampleErrors: Array<{ id: string; errors: string[] }> = [];

  for (const f of fixtures) {
    const errors = validateRealEstateFixture(f);
    if (errors.length === 0) {
      healthy.push(f);
      continue;
    }
    for (const e of errors) {
      rejectionReasons[e] = (rejectionReasons[e] ?? 0) + 1;
    }
    if (sampleErrors.length < 20) {
      sampleErrors.push({ id: f.id, errors });
    }
  }

  return {
    healthy,
    report: {
      total: fixtures.length,
      healthy: healthy.length,
      rejected: fixtures.length - healthy.length,
      rejectionReasons,
      sampleErrors,
    },
  };
}

export function dedupeRealEstateFixtures(fixtures: DatasetFixture[]): DatasetFixture[] {
  const seen = new Set<string>();
  const out: DatasetFixture[] = [];
  for (const f of fixtures) {
    const key = normalizeInput(f.input);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
