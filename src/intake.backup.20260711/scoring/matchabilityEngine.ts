import type { IntakeEntities } from '@/intake/types';
import { hasEntityValue } from '@/intake/entities/entityRegistry';

interface MatchabilityRule {
  field: string;
  weight: number;
  required: boolean;
}

const DEFAULT_RULES: readonly MatchabilityRule[] = [
  { field: 'category', weight: 35, required: true },
  { field: 'city', weight: 30, required: true },
  { field: 'neighborhood', weight: 20, required: false },
  { field: 'budget', weight: 10, required: false },
  { field: 'transactionType', weight: 5, required: false },
];

const REAL_ESTATE_RULES: readonly MatchabilityRule[] = [
  { field: 'category', weight: 25, required: true },
  { field: 'transactionType', weight: 20, required: true },
  { field: 'city', weight: 20, required: true },
  { field: 'neighborhood', weight: 20, required: true },
  { field: 'budget', weight: 10, required: false },
  { field: 'area', weight: 5, required: false },
];

const SERVICES_RULES: readonly MatchabilityRule[] = [
  { field: 'category', weight: 35, required: true },
  { field: 'city', weight: 30, required: true },
  { field: 'neighborhood', weight: 20, required: false },
  { field: 'budget', weight: 15, required: false },
];

function resolveRules(entities: IntakeEntities): readonly MatchabilityRule[] {
  if (entities.vertical === 'real-estate') return REAL_ESTATE_RULES;
  if (entities.vertical === 'services') return SERVICES_RULES;
  return DEFAULT_RULES;
}

/** Independent from completion; estimates lead-match usefulness of a need. */
export function computeMatchabilityScore(entities: IntakeEntities): number {
  const rules = resolveRules(entities);
  let score = 0;

  for (const rule of rules) {
    if (hasEntityValue(entities, rule.field)) {
      score += rule.weight;
    } else if (rule.required) {
      score -= Math.round(rule.weight * 0.35);
    }
  }

  return Math.max(0, Math.min(100, score));
}
