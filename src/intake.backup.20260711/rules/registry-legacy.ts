/**
 * Client-safe rules matcher: legacy keywords/synonyms only (no pack JSON / fs).
 */
import { buildLegacyIntakeRules } from '@/intake/rules/legacy-bridge';
import { matchCategoryFromRuleSet } from '@/intake/rules/registry-match';
import type { CategoryMatchResult, IntakeRule } from '@/intake/rules/types';

let legacyRulesCache: IntakeRule[] | null = null;

function legacyRules(): IntakeRule[] {
  if (!legacyRulesCache) legacyRulesCache = buildLegacyIntakeRules();
  return legacyRulesCache;
}

export function matchCategoryFromLegacyRules(text: string): CategoryMatchResult | null {
  const rules = legacyRules();
  const negative = rules.filter((r) => r.kind === 'negative');
  const positive = rules.filter((r) => r.kind !== 'negative');
  return matchCategoryFromRuleSet(text, positive, negative);
}
