import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { MarathonCaseResult } from './marathon-evaluator';
import type { IntakeRule, RulePack } from '@/intake/rules/types';
import { RULES_PACKS_DIR } from '@/intake/rules/config';
import { clearRulesRegistryCache } from '@/intake/rules/registry.server';

const OVERRIDES_FILE = 'marathon-overrides.pack.json';

const STOP_WORDS = new Set([
  '\u0648',
  '\u062F\u0631',
  '\u0628\u0627',
  '\u0628\u0647',
  '\u0627\u0632',
  '\u062A\u0627',
  '\u06CC\u0647',
  '\u0645\u06CC',
  '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647',
  '\u0646\u06CC\u0627\u0632',
  '\u062F\u0631',
  '\u0628\u0631\u0627\u06CC',
  '\u0647\u0645',
  '\u0647\u0645\u0647',
  '\u0627\u06AF\u0631',
  '\u0644\u0637\u0641\u0627',
]);

function overridesPath(): string {
  return join(process.cwd(), RULES_PACKS_DIR, OVERRIDES_FILE);
}

function loadOverrides(): RulePack {
  const path = overridesPath();
  if (!existsSync(path)) {
    return {
      meta: { slug: 'marathon-overrides', version: 1, ruleCount: 0 },
      rules: [],
    };
  }
  return JSON.parse(readFileSync(path, 'utf8')) as RulePack;
}

function extractKeywords(text: string, max = 5): string[] {
  const tokens = text
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export interface RulePatchReport {
  added: number;
  skipped: number;
  rules: IntakeRule[];
}

/** Append keyword rules from failed cases targeting expected category slug. */
export function patchRulesFromFailures(failures: MarathonCaseResult[]): RulePatchReport {
  if (failures.length === 0) {
    return { added: 0, skipped: 0, rules: [] };
  }

  const pack = loadOverrides();
  const existing = new Set(pack.rules.map((r) => `${r.slug}|${r.pattern}`));
  const newRules: IntakeRule[] = [];
  let seq = pack.rules.length;
  let skipped = 0;

  for (const f of failures) {
    const slug = f.categorySlug;
    const keywords = extractKeywords(f.text, 4);
    for (const kw of keywords) {
      const key = `${slug}|${kw}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      existing.add(key);
      const rule: IntakeRule = {
        id: `marathon-${slug}-${seq++}`,
        kind: 'keyword',
        slug,
        pattern: kw,
        priority: 15,
        weight: 3,
      };
      newRules.push(rule);
      pack.rules.push(rule);
    }
  }

  if (newRules.length > 0) {
    pack.meta = {
      ...pack.meta,
      slug: 'marathon-overrides',
      version: (pack.meta?.version ?? 0) + 1,
      ruleCount: pack.rules.length,
    };
    writeFileSync(overridesPath(), `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    clearRulesRegistryCache();
  }

  return { added: newRules.length, skipped, rules: newRules };
}
