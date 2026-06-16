import 'server-only';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RULES_PACKS_DIR } from '@/intake/rules/config';
import { buildLegacyIntakeRules } from '@/intake/rules/legacy-bridge';
import { matchCategoryFromRuleSet } from '@/intake/rules/registry-match';
import type { CategoryMatchResult, IntakeRule, RulePack } from '@/intake/rules/types';

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

export function matchCategoryFromRules(text: string): CategoryMatchResult | null {
  return matchCategoryFromRuleSet(text, positiveRules(), allNegativeRules());
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
