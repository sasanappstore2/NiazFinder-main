import 'server-only';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RULES_PACKS_DIR } from '@/intake/rules/config';
import { buildLegacyIntakeRules } from '@/intake/rules/legacy-bridge';
import {
  hasStrongEstatePropertySignal,
  isEstateLeafSlug,
} from '@/intake/rules/estate/estate-collision-table';
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

let packsBySlug: Map<string, RulePack> | null = null;
let legacyPositiveCache: IntakeRule[] | null = null;
let legacyNegativeCache: IntakeRule[] | null = null;
let matchPositiveCache: IntakeRule[] | null = null;
let matchNegativeCache: IntakeRule[] | null = null;
let ruleCountCache: number | null = null;

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

function slugFromPackFilename(name: string): string {
  return name.replace(/\.pack\.json$/i, '');
}

/**
 * Load packs used for category matching.
 * Estate leaf packs are skipped here — matching uses legacy + collision table instead
 * (cartesian estate packs are large and slow without improving leaf disambiguation).
 * getRulePack() still loads any slug on demand for required-fields metadata.
 */
function loadMatchPacks(): Map<string, RulePack> {
  if (packsBySlug) return packsBySlug;

  packsBySlug = new Map();
  const dir = join(projectRoot(), RULES_PACKS_DIR);
  if (!existsSync(dir)) return packsBySlug;

  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.pack.json')) continue;
    const slug = slugFromPackFilename(name);
    if (isEstateLeafSlug(slug)) continue;
    const pack = loadPackFile(join(dir, name));
    if (pack?.meta?.slug) {
      packsBySlug.set(pack.meta.slug, pack);
    }
  }

  return packsBySlug;
}

function legacyPositiveRules(): IntakeRule[] {
  if (legacyPositiveCache) return legacyPositiveCache;
  legacyPositiveCache = buildLegacyIntakeRules().filter((r) => r.kind !== 'negative');
  return legacyPositiveCache;
}

function legacyNegativeRules(): IntakeRule[] {
  if (legacyNegativeCache) return legacyNegativeCache;
  legacyNegativeCache = buildLegacyIntakeRules().filter((r) => r.kind === 'negative');
  return legacyNegativeCache;
}

function matchPositiveRules(): IntakeRule[] {
  if (matchPositiveCache) return matchPositiveCache;
  const rules: IntakeRule[] = [...legacyPositiveRules()];
  for (const pack of loadMatchPacks().values()) {
    for (const rule of pack.rules) {
      if (rule.kind !== 'negative') rules.push(rule);
    }
  }
  matchPositiveCache = rules;
  return rules;
}

function matchNegativeRules(): IntakeRule[] {
  if (matchNegativeCache) return matchNegativeCache;
  const rules: IntakeRule[] = [...legacyNegativeRules()];
  for (const pack of loadMatchPacks().values()) {
    for (const rule of pack.rules) {
      if (rule.kind === 'negative') rules.push(rule);
    }
  }
  matchNegativeCache = rules;
  return rules;
}

export function getRulePack(slug: string): RulePack | null {
  const cached = loadMatchPacks().get(slug);
  if (cached) return cached;
  // On-demand load (including estate packs) for metadata / required fields.
  const path = join(projectRoot(), RULES_PACKS_DIR, `${slug}.pack.json`);
  if (!existsSync(path)) return null;
  return loadPackFile(path);
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

function resolvePositiveRulesForText(text: string, opts?: MatchCategoryOptions): IntakeRule[] {
  // Estate-framed text: legacy + collision table is enough (and ~100x cheaper than packs).
  if (hasStrongEstatePropertySignal(text)) {
    return filterPositiveRules(legacyPositiveRules(), opts);
  }
  return filterPositiveRules(matchPositiveRules(), opts);
}

function resolveNegativeRulesForText(text: string): IntakeRule[] {
  if (hasStrongEstatePropertySignal(text)) {
    return legacyNegativeRules();
  }
  return matchNegativeRules();
}

export function matchCategoryFromRules(
  text: string,
  opts?: MatchCategoryOptions
): CategoryMatchResult | null {
  const positive = resolvePositiveRulesForText(text, opts);
  return matchCategoryFromRuleSet(text, positive, resolveNegativeRulesForText(text));
}

export function matchCategoryCandidatesFromRules(
  text: string,
  opts?: MatchCategoryOptions & { limit?: number }
): CategoryMatchCandidate[] {
  const positive = resolvePositiveRulesForText(text, opts);
  return matchCategoryCandidatesFromRuleSet(text, positive, resolveNegativeRulesForText(text), {
    limit: opts?.limit,
  });
}

export { isCategoryAmbiguous, pickCategoryIfClear, candidateToCategoryMatchResult };

export function pickClearCategoryFromRules(
  text: string,
  opts?: MatchCategoryOptions
): CategoryMatchResult | null {
  const positive = resolvePositiveRulesForText(text, opts);
  const candidates = matchCategoryCandidatesFromRuleSet(
    text,
    positive,
    resolveNegativeRulesForText(text)
  );
  return pickCategoryIfClear(text, candidates, positive);
}

export function clearRulesRegistryCache(): void {
  packsBySlug = null;
  legacyPositiveCache = null;
  legacyNegativeCache = null;
  matchPositiveCache = null;
  matchNegativeCache = null;
  ruleCountCache = null;
}

export function countLoadedRules(): number {
  if (ruleCountCache != null) return ruleCountCache;
  let n = buildLegacyIntakeRules().length;
  const dir = join(projectRoot(), RULES_PACKS_DIR);
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.pack.json')) continue;
      const pack = loadPackFile(join(dir, name));
      if (pack) n += pack.rules.length;
    }
  }
  ruleCountCache = n;
  return n;
}

export function countLoadedPacks(): number {
  const dir = join(projectRoot(), RULES_PACKS_DIR);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((n) => n.endsWith('.pack.json')).length;
}
