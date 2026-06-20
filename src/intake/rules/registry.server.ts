import 'server-only';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RULES_PACKS_DIR } from '@/intake/rules/config';
import { buildLegacyIntakeRules } from '@/intake/rules/legacy-bridge';
import {
  candidateToCategoryMatchResult,
  isCategoryAmbiguous,
  matchCategoryCandidatesFromRuleSet,
  matchCategoryFromRuleSet,
  pickCategoryIfClear,
} from '@/intake/rules/registry-match';
import type { CategoryMatchCandidate, CategoryMatchResult, IntakeRule, RulePack } from '@/intake/rules/types';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import { slugBelongsToAnyVertical } from '@/intake/intelligence-engine/hybrid/vertical-slug-index';

export interface MatchCategoryOptions {
  verticalFilter?: readonly ClassifierVertical[];
  slugHints?: readonly string[];
}

let packRulesCache: IntakeRule[] | null = null;
let negativeRulesCache: IntakeRule[] | null = null;
let packsBySlug: Map<string, RulePack> | null = null;

function projectRoot(): string {
  return process.cwd();
}

function loadPackFile(path: string): RulePack | null {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as RulePack;
  } catch {
    return null;
  }
}

function loadAllPacks(): Map<string, RulePack> {
  if (packsBySlug) return packsBySlug;

  packsBySlug = new Map();
  const dir = join(projectRoot(), RULES_PACKS_DIR);
  if (!existsSync(dir)) return packsBySlug;

  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.pack.json')) continue;
    const pack = loadPackFile(join(dir, name));
    if (pack?.meta?.slug) {
      packsBySlug.set(pack.meta.slug, pack);
    }
  }

  return packsBySlug;
}

function allPackRules(): IntakeRule[] {
  if (packRulesCache) return packRulesCache;

  const rules: IntakeRule[] = [...buildLegacyIntakeRules()];
  for (const pack of loadAllPacks().values()) {
    rules.push(...pack.rules);
  }
  packRulesCache = rules;
  return rules;
}

function allNegativeRules(): IntakeRule[] {
  if (negativeRulesCache) return negativeRulesCache;
  negativeRulesCache = allPackRules().filter((r) => r.kind === 'negative');
  return negativeRulesCache;
}

function positiveRules(): IntakeRule[] {
  return allPackRules().filter((r) => r.kind !== 'negative');
}

export function getRulePack(slug: string): RulePack | null {
  return loadAllPacks().get(slug) ?? null;
}

export function getPackRequiredFields(slug: string): string[] {
  const pack = getRulePack(slug);
  return pack?.meta.requiredFields ?? [];
}

function filterPositiveRules(rules: IntakeRule[], opts?: MatchCategoryOptions): IntakeRule[] {
  if (!opts?.verticalFilter?.length && !opts?.slugHints?.length) return rules;

  const hintSet = opts.slugHints?.length ? new Set(opts.slugHints) : null;

  return rules.filter((r) => {
    if (hintSet?.has(r.slug)) return true;
    if (opts.verticalFilter?.length) {
      return slugBelongsToAnyVertical(r.slug, opts.verticalFilter);
    }
    return true;
  });
}

export function matchCategoryFromRules(
  text: string,
  opts?: MatchCategoryOptions
): CategoryMatchResult | null {
  const positive = filterPositiveRules(positiveRules(), opts);
  if (!positive.length) {
    return matchCategoryFromRuleSet(text, positiveRules(), allNegativeRules());
  }
  return matchCategoryFromRuleSet(text, positive, allNegativeRules());
}

export function matchCategoryCandidatesFromRules(
  text: string,
  opts?: MatchCategoryOptions & { limit?: number }
): CategoryMatchCandidate[] {
  const positive = filterPositiveRules(positiveRules(), opts);
  const rules = positive.length ? positive : positiveRules();
  return matchCategoryCandidatesFromRuleSet(text, rules, allNegativeRules(), {
    limit: opts?.limit,
  });
}

export { isCategoryAmbiguous, pickCategoryIfClear, candidateToCategoryMatchResult };

export function pickClearCategoryFromRules(
  text: string,
  opts?: MatchCategoryOptions
): CategoryMatchResult | null {
  const positive = filterPositiveRules(positiveRules(), opts);
  const rules = positive.length ? positive : positiveRules();
  const candidates = matchCategoryCandidatesFromRuleSet(text, rules, allNegativeRules());
  return pickCategoryIfClear(text, candidates, rules);
}

export function clearRulesRegistryCache(): void {
  packRulesCache = null;
  negativeRulesCache = null;
  packsBySlug = null;
}

export function countLoadedRules(): number {
  return allPackRules().length;
}

export function countLoadedPacks(): number {
  return loadAllPacks().size;
}
