/**
 * Single required-field resolver for template, pack, missing detection, and publish.
 * Slug-aware: prefers leaf critical catalog + filter `required` flags.
 */

import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';
import { getCategoryPath } from '@/config/categories';

export interface RequiredFieldResolution {
  /** Fields that must be present to publish / complete. */
  requiredKeys: string[];
  /** Critical intake fields (may overlap required). */
  criticalKeys: string[];
  /** Keys currently missing from answers/entities. */
  missingFieldKeys: string[];
  /** Low-confidence keys that should be marked for review. */
  lowConfidenceKeys: string[];
}

const ALWAYS_CONTEXT = ['city', 'categorySlug'] as const;

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return Boolean(value);
}

function readField(
  key: string,
  answers: Record<string, unknown>,
  entities: Record<string, unknown>
): unknown {
  if (hasValue(answers[key])) return answers[key];
  if (hasValue(entities[key])) return entities[key];
  // Compatibility aliases
  if (key === 'transactionType' && hasValue(answers.dealType)) return answers.dealType;
  if (key === 'dealType' && hasValue(entities.transactionType)) return entities.transactionType;
  if (key === 'buildingAge' && (hasValue(answers.yearMin) || hasValue(entities.yearMin))) {
    return answers.yearMin ?? entities.yearMin;
  }
  if (key === 'areaMin' && hasValue(entities.area)) return entities.area;
  if (key === 'budget' && (hasValue(entities.budgetMax) || hasValue(answers.budgetMax))) {
    return entities.budgetMax ?? answers.budgetMax;
  }
  return undefined;
}

/**
 * Resolve required + missing keys for a category leaf slug.
 */
export function resolveRequiredFields(input: {
  categorySlug: string | null | undefined;
  answers?: Record<string, unknown>;
  entities?: Record<string, unknown>;
  fieldConfidence?: Record<string, number>;
  confidenceThreshold?: number;
}): RequiredFieldResolution {
  const slug = (input.categorySlug ?? '').trim();
  const answers = input.answers ?? {};
  const entities = input.entities ?? {};
  const threshold = input.confidenceThreshold ?? 0.6;

  const merged = slug ? getMergedFieldsForCategory(slug, 'need') : [];
  const requiredFromSpec = merged.filter((f) => f.required && f.intake !== false).map((f) => f.key);
  const critical = slug ? [...getCriticalIntakeFields(slug)] : [];

  const path = slug ? getCategoryPath(slug) : [];
  const root = path[0]?.slug ?? '';
  const isEstate = root === 'real-estate' || slug.includes('apartment') || slug.includes('villa');

  const requiredKeys = Array.from(
    new Set([
      ...ALWAYS_CONTEXT.filter((k) => {
        if (k === 'categorySlug') return true;
        if (k === 'city') return isEstate || Boolean(slug);
        return false;
      }),
      ...requiredFromSpec,
      ...(isEstate ? ['dealType'] : []),
    ])
  );

  const criticalKeys = Array.from(new Set([...critical, ...requiredKeys]));

  const missingFieldKeys = requiredKeys.filter(
    (key) => !hasValue(readField(key, answers, entities))
  );

  const lowConfidenceKeys: string[] = [];
  if (input.fieldConfidence) {
    for (const key of criticalKeys) {
      if (!hasValue(readField(key, answers, entities))) continue;
      const conf = input.fieldConfidence[key];
      if (typeof conf === 'number' && conf < threshold) {
        lowConfidenceKeys.push(key);
      }
    }
  }

  return {
    requiredKeys,
    criticalKeys,
    missingFieldKeys,
    lowConfidenceKeys,
  };
}

/** Map buildingAge chip → yearMin/yearMax for browse/search compatibility. */
export function expandBuildingAgeAlias(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const age = answers.buildingAge;
  if (typeof age !== 'string' || !age || age === 'any') return answers;
  const next = { ...answers };
  if (age === '0-5') {
    next.yearMin = 0;
    next.yearMax = 5;
  } else if (age === '5-10') {
    next.yearMin = 5;
    next.yearMax = 10;
  } else if (age === '10-20') {
    next.yearMin = 10;
    next.yearMax = 20;
  } else if (age === '20+') {
    next.yearMin = 20;
  }
  return next;
}

/** Prefer dealType; mirror to transactionType for legacy readers. */
export function syncDealTransactionAliases(
  answers: Record<string, unknown>,
  entities: Record<string, unknown>
): { answers: Record<string, unknown>; entities: Record<string, unknown> } {
  const deal =
    (typeof answers.dealType === 'string' && answers.dealType) ||
    (typeof entities.dealType === 'string' && entities.dealType) ||
    (typeof entities.transactionType === 'string' && entities.transactionType) ||
    null;
  if (!deal) return { answers, entities };
  return {
    answers: { ...answers, dealType: deal },
    entities: { ...entities, dealType: deal, transactionType: entities.transactionType ?? deal },
  };
}
