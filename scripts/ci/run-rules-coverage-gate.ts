#!/usr/bin/env npx tsx
/**
 * Rules coverage gate: run real-user batch + in-process intelligence (rules-only).
 * Target: >= 90% pass rate without AI.
 *
 * Run: npm run test:rules-coverage-gate
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { countLoadedRules } from '@/intake/rules/registry.server';
import { getCategoryPath } from '@/config/categories';

process.env.NEED_INTAKE_RULES_ONLY = 'true';
process.env.NEED_INTAKE_LLM_ENABLED = 'false';
process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

interface Case {
  id: string;
  text: string;
  expectedSlug: string;
  acceptParents?: string[];
  cityName?: string;
}

const CASES: Case[] = [
  {
    id: 'piano-yamaha',
    text: '\u0645\u0646 \u06CC\u06A9 \u067E\u06CC\u0627\u0646\u0648 \u06CC\u0627\u0645\u0627\u0647\u0627 \u0646\u0648 \u0645\u06CC\u062E\u0648\u0627\u0645 \u062F\u0631 \u0634\u0627\u0646\u062F\u06CC\u0632 \u0645\u0634\u0647\u062F \u0633\u0627\u06A9\u0646 \u0647\u0633\u062A\u0645',
    expectedSlug: 'musical-instruments',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'apartment-rahn-tehran',
    text: '\u062F\u0646\u0628\u0627\u0644 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628 \u062A\u0647\u0631\u0627\u0646 \u0631\u0647\u0646 \u06F5\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u06F5 \u0645\u06CC\u0644\u06CC\u0648\u0646',
    expectedSlug: 'apartment-rent',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'iphone-shiraz',
    text: '\u06AF\u0648\u0634\u06CC \u0622\u06CC\u0641\u0648\u0646 \u06F1\u06F3 \u067E\u0631\u0648 \u062F\u0633\u062A \u062F\u0648\u0645 \u0634\u06CC\u0631\u0627\u0632',
    expectedSlug: 'mobile-phone',
    acceptParents: ['mobile-tablet'],
    cityName: '\u0634\u06CC\u0631\u0627\u0632',
  },
  {
    id: 'peugeot-206',
    text: '\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0645\u062F\u0644 \u06F8\u06F40 \u062A\u0645\u06CC\u0632 \u0645\u06CC\u062E\u0631\u0645',
    expectedSlug: 'car-ride',
    acceptParents: ['car'],
  },
  {
    id: 'plumber',
    text: '\u0644\u0648\u0644\u0647 \u062E\u0648\u0631\u062F\u0647 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062A\u0647\u0631\u0627\u0646',
    expectedSlug: 'plumbing',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'motorcycle-honda',
    text: '\u0645\u0648\u062A\u0648\u0631 \u0647\u0648\u0646\u062F\u0627 \u06F1\u06F2\u06F5 \u0641\u0648\u0631\u06CC \u0628\u0641\u0631\u0648\u0634\u0645',
    expectedSlug: 'motorcycle',
  },
  {
    id: 'ps5-tabriz',
    text: '\u062F\u0646\u0628\u0627\u0644 \u067E\u0644\u06CC\u200C\u0627\u0633\u062A\u06CC\u0634\u0646 \u06F5 \u062A\u0628\u0631\u06CC\u0632',
    expectedSlug: 'game-console',
    cityName: '\u062A\u0628\u0631\u06CC\u0632',
  },
  {
    id: 'violin-yamaha-mashhad',
    text: '\u0645\u0646 \u06CC\u06A9 \u0648\u06CC\u0648\u0644\u0648\u0646 \u0646\u0648 \u0645\u06CC\u062E\u0648\u0627\u0645 \u0627\u0632 \u0628\u0631\u0646\u062F \u06CC\u0627\u0645\u0627\u0647\u0627 \u062F\u0631 \u067E\u06CC\u0631\u0648\u0632\u06CC \u0645\u0634\u0647\u062F \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u06A9\u0646\u0645 \u0627\u06AF\u0631 \u0645\u0648\u0631\u062F\u06CC \u062F\u0627\u0631\u06CC\u062F \u0628\u0647 \u0628\u0646\u062F\u0647 \u067E\u06CC\u0627\u0645 \u0628\u062F\u06CC\u062F',
    expectedSlug: 'musical-instruments',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'lost-wallet',
    text: '\u06A9\u0627\u0631\u062A \u0628\u0627\u0646\u06A9\u06CC \u0631\u0627 \u062F\u0631 \u0645\u062A\u0631\u0648 \u0648\u0646\u06A9 \u06AF\u0645 \u06A9\u0631\u062F\u0645',
    expectedSlug: 'lost-found',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
];

function slugMatches(actual: string, expected: string, acceptParents: string[] = []): boolean {
  if (actual === expected) return true;
  const path = getCategoryPath(actual).map((c) => c.slug);
  if (path.includes(expected)) return true;
  for (const p of acceptParents) {
    if (actual === p || path.includes(p)) return true;
  }
  return getCategoryPath(expected).map((c) => c.slug).includes(actual);
}

function titleBad(title: string, source: string): boolean {
  if (!title.trim()) return true;
  if (title.includes('\u0645\u0646 \u06CC\u06A9 ')) return true;
  if (title.includes('\u0633\u0627\u06A9\u0646 \u0647\u0633\u062A\u0645')) return true;
  return false;
}

async function main(): Promise<void> {
  clearIntelligenceCache();
  console.log(`rules loaded: ${countLoadedRules()}`);

  const results: Array<{
    id: string;
    ok: boolean;
    got: string;
    title: string;
    aiInvoked: boolean;
    issues: string[];
  }> = [];

  for (const c of CASES) {
    const issues: string[] = [];
    const result = await runIntakeIntelligence(
      { text: c.text, cityName: c.cityName, forceAi: false },
      { skipCache: true }
    );
    const got =
      String(result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value ?? '');
    const title = resolveDeterministicListingTitle(result.draft).title;

    if (result.meta.aiInvoked) issues.push('ai_invoked');
    if (!slugMatches(got, c.expectedSlug, c.acceptParents)) {
      issues.push(`category:${got}!=${c.expectedSlug}`);
    }
    if (titleBad(title, c.text)) issues.push('bad_title');
    if ((result.fields.categorySlug?.confidence ?? 0) < 0.75) {
      issues.push('low_confidence');
    }

    results.push({
      id: c.id,
      ok: issues.length === 0,
      got,
      title,
      aiInvoked: result.meta.aiInvoked,
      issues,
    });
  }

  const ok = results.filter((r) => r.ok).length;
  const rate = Math.round((ok / results.length) * 1000) / 10;

  console.log(`\nrules-coverage-gate: ${ok}/${results.length} (${rate}%)`);
  for (const r of results) {
    console.log(`[${r.ok ? 'OK' : 'FAIL'}] ${r.id} cat=${r.got} title=${r.title}`);
    if (r.issues.length) console.log(`  issues: ${r.issues.join(', ')}`);
  }

  const reportDir = join(process.cwd(), 'reports');
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, `rules-coverage-gate-${Date.now()}.json`),
    JSON.stringify({ ok, total: results.length, rate, results }, null, 2)
  );

  const minRate = Number(process.env.RULES_COVERAGE_MIN_RATE ?? 90);
  process.exit(rate >= minRate ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
