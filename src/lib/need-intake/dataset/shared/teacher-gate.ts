import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import type { DatasetFixture, DatasetSource } from '../schema';
import { labelsFromParsedIntent } from '../schema';
import { normalizeInput } from './normalize-input';

export interface TeacherGateOptions {
  expectedSlug: string;
  /** Match parsed category/subcategory haystack includes this fragment */
  slugIncludes?: string;
  intentPrefix?: string;
  dealType?: string;
  minConfidence?: number;
  vertical?: ClassifierVertical;
  source?: DatasetSource;
  tags?: string[];
  idPrefix?: string;
}

export function slugHaystack(categorySlug: string, subcategorySlug?: string | null): string {
  return [categorySlug, subcategorySlug].filter(Boolean).join(' ');
}

export function teacherMatchesCategory(
  input: string,
  options: TeacherGateOptions
): DatasetFixture | null {
  const parsed = parseIntentFromText(input);
  const haystack = slugHaystack(parsed.categorySlug, parsed.subcategorySlug);
  const slugNeedle = options.slugIncludes ?? options.expectedSlug;

  if (options.slugIncludes) {
    if (!haystack.includes(options.slugIncludes)) return null;
  } else if (!haystack.includes(options.expectedSlug)) {
    return null;
  }

  if (options.intentPrefix && !parsed.intentType.startsWith(options.intentPrefix)) {
    return null;
  }

  if (options.dealType && parsed.entities.dealType !== options.dealType) {
    return null;
  }

  const minConf = options.minConfidence ?? 0.5;
  if (parsed.confidence < minConf) return null;

  const id = `${options.idPrefix ?? 'gen'}-${options.expectedSlug}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    input,
    labels: labelsFromParsedIntent(parsed),
    meta: {
      source: options.source ?? 'fixture',
      vertical: options.vertical,
      tags: ['generated', ...(options.tags ?? [])],
    },
  };
}

export function acceptWebTitle(
  title: string,
  expectedSlug: string,
  vertical: ClassifierVertical,
  minConfidence = 0.6
): DatasetFixture | null {
  const trimmed = title.trim();
  if (trimmed.length < 12 || trimmed.length > 220) return null;
  if (/بروزرسانی|دانلود نسخه|تبلیغات/i.test(trimmed)) return null;

  const parsed = parseIntentFromText(trimmed);
  if (parsed.confidence < minConfidence) return null;

  const haystack = slugHaystack(parsed.categorySlug, parsed.subcategorySlug);
  if (!haystack.includes(expectedSlug)) return null;

  const id = `web-${expectedSlug}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    input: trimmed,
    labels: labelsFromParsedIntent(parsed),
    meta: { source: 'captured', vertical, tags: ['web', 'divar'] },
  };
}

export function dedupeFixtures(fixtures: DatasetFixture[]): DatasetFixture[] {
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
