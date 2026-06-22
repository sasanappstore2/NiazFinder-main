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
let positiveRulesBySlugCache: Map<string, IntakeRule[]> | null = null;

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

/** Positive rules grouped by slug — built once, enables fast scoped scoring. */
function positiveRulesBySlug(): Map<string, IntakeRule[]> {
  if (positiveRulesBySlugCache) return positiveRulesBySlugCache;
  const map = new Map<string, IntakeRule[]>();
  for (const r of positiveRules()) {
    const arr = map.get(r.slug);
    if (arr) arr.push(r);
    else map.set(r.slug, [r]);
  }
  positiveRulesBySlugCache = map;
  return map;
}

/**
 * Score rules for ONLY the given candidate slugs — avoids the full ~1.16M-rule
 * scan. Used by the semantic-fusion path: semantic narrows to top-K slugs, then
 * we apply the keyword/brand rules within just those packs.
 */
export function matchCandidatesWithinSlugs(
  text: string,
  slugs: readonly string[],
  opts?: { limit?: number }
): CategoryMatchCandidate[] {
  if (!slugs.length) return [];
  const bySlug = positiveRulesBySlug();
  const scoped: IntakeRule[] = [];
  for (const slug of slugs) {
    const arr = bySlug.get(slug);
    if (arr) scoped.push(...arr);
  }
  if (!scoped.length) return [];
  return matchCategoryCandidatesFromRuleSet(text, scoped, allNegativeRules(), {
    limit: opts?.limit,
  });
}

/**
 * Build a full CategoryMatchResult for one slug, scoring + extracting fields
 * (brand/model/condition) from ONLY that slug's rules. Used by the semantic
 * fusion path once a winning category is chosen. Returns a minimal result if
 * the slug's rules don't fire on the text.
 */
export function buildMatchResultForSlug(
  text: string,
  slug: string,
  confidence: number
): CategoryMatchResult {
  const scoped = positiveRulesBySlug().get(slug) ?? [];
  const candidates = scoped.length
    ? matchCategoryCandidatesFromRuleSet(text, scoped, allNegativeRules(), { limit: 1 })
    : [];
  const top = candidates[0];
  if (top) {
    const result = candidateToCategoryMatchResult(text, top, scoped);
    return { ...result, confidence: Math.max(result.confidence, confidence) };
  }
  return {
    categorySlug: slug,
    confidence,
    score: 0,
    matchedRules: [],
  };
}

export function clearRulesRegistryCache(): void {
  packRulesCache = null;
  negativeRulesCache = null;
  packsBySlug = null;
  positiveRulesBySlugCache = null;
}

export function countLoadedRules(): number {
  return allPackRules().length;
}

export function countLoadedPacks(): number {
  return loadAllPacks().size;
}
