/**
 * Real-user style intake batch: 32 unusual Persian need texts across verticals.
 * In-process rules-only by default (no dev server). Set INTAKE_BATCH_USE_HTTP=1 for live API.
 *
 * Run: npm run test:real-user-intake-batch
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getCategoryPath } from '@/config/categories';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import type { NeedDraft } from '@/contracts/need-intake';

process.env.NEED_INTAKE_RULES_ONLY = 'true';
process.env.NEED_INTAKE_LLM_ENABLED = 'false';
process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

interface BatchCase {
  id: string;
  text: string;
  expectedSlug: string;
  /** Accept parent slug when leaf differs (e.g. real-estate bucket). */
  acceptParents?: string[];
  cityName?: string;
}

const CASES: BatchCase[] = [
  {
    id: 'piano-yamaha',
    text: '\u0645\u0646 \u06CC\u06A9 \u067E\u06CC\u0627\u0646\u0648 \u06CC\u0627\u0645\u0627\u0647\u0627 \u0646\u0648 \u0645\u06CC\u062E\u0648\u0627\u0645 \u062F\u0631 \u0634\u0627\u0646\u062F\u06CC\u0632 \u0645\u0634\u0647\u062F \u0633\u0627\u06A9\u0646 \u0647\u0633\u062A\u0645',
    expectedSlug: 'musical-instruments',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'apartment-rahn-tehran',
    text: '\u062F\u0646\u0628\u0627\u0644 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628 \u062A\u0647\u0631\u0627\u0646 \u067E\u0627\u0631\u06A9 \u062C\u0627\u0645 \u0639\u0628\u062F\u06CC\u0647 \u0631\u0647\u0646 \u06F5\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u06F5 \u0645\u06CC\u0644\u06CC\u0648\u0646',
    expectedSlug: 'apartment-rent',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'shop-rahn-mashhad',
    text: '\u0645\u063A\u0627\u0632\u0647 \u06F9\u06F0 \u0645\u062A\u0631\u06CC \u062E\u06CC\u0627\u0628\u0627\u0646 \u0633\u062C\u0627\u062F \u0645\u0634\u0647\u062F \u06F1 \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F \u0631\u0647\u0646 \u06F1\u06F0\u06F0 \u062A\u0648\u0645\u0627\u0646 \u0627\u062C\u0627\u0631\u0647',
    expectedSlug: 'shop-rent',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'villa-sale-north',
    text: '\u0648\u06CC\u0644\u0627 \u06F3\u06F0\u06F0 \u0645\u062A\u0631 \u0628\u0627 \u0627\u0633\u062A\u062E \u0628\u0627\u063A \u062F\u0631 \u0628\u0644\u0648\u0627\u0631 \u062A\u0647\u0631\u0627\u0646 \u0645\u06CC\u0641\u0631\u0648\u0634\u0645 \u06F1\u06F5 \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F',
    expectedSlug: 'villa-sale',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'land-partnership',
    text: '\u0632\u0645\u06CC\u0646 \u06F5\u06F0\u06F0 \u0645\u062A\u0631 \u0627\u0635\u0641\u0647\u0627\u0646 \u0628\u0631\u0627\u06CC \u0645\u0634\u0627\u0631\u06A9\u062A \u062F\u0631 \u0633\u0627\u062E\u062A \u062F\u0646\u0628\u0627\u0644 \u0634\u0631\u06CC\u06A9 \u062F\u0627\u0631\u0645',
    expectedSlug: 'construction-partnership',
    acceptParents: ['land-sale', 'real-estate'],
    cityName: '\u0627\u0635\u0641\u0647\u0627\u0646',
  },
  {
    id: 'suite-daily-isfahan',
    text: '\u0633\u0648\u0626\u06CC\u062A \u0627\u062C\u0627\u0631\u0647 \u0631\u0648\u0632\u0627\u0646\u0647 \u0646\u0632\u062F\u06CC\u06A9 \u062C\u0627\u0645 \u0627\u0635\u0641\u0647\u0627\u0646 \u0628\u0631\u0627\u06CC \u06F3 \u0634\u0628',
    expectedSlug: 'suite-apartment-rent',
    cityName: '\u0627\u0635\u0641\u0647\u0627\u0646',
  },
  {
    id: 'peugeot-206-used',
    text: '\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0645\u062F\u0644 \u06F8\u06F4\u06F0 \u06A9\u0627\u0631\u06A9\u0631\u062F \u062A\u0645\u06CC\u0632 \u0645\u06CC\u062E\u0631\u0645 \u062A\u0627 \u06F8\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0648\u0646',
    expectedSlug: 'car-ride',
    acceptParents: ['car'],
  },
  {
    id: 'honda-motorcycle-not-bicycle',
    text: '\u0645\u0648\u062A\u0648\u0631 \u0647\u0648\u0646\u062F\u0627 \u06F1\u06F2\u06F5 \u0633\u0627\u0644\u0645 \u062F\u0633\u062A \u062F\u0648\u0645 \u0641\u0648\u0631\u06CC \u0628\u0641\u0631\u0648\u0634\u0645 \u0642\u0631\u0627\u0631 \u06F4\u06F5 \u0645\u06CC\u0644\u06CC\u0648\u0646',
    expectedSlug: 'motorcycle',
  },
  {
    id: 'iphone-used-shiraz',
    text: '\u06AF\u0648\u0634\u06CC \u0622\u06CC\u0641\u0648\u0646 \u06F1\u06F3 \u067E\u0631\u0648 \u062F\u0633\u062A \u062F\u0648\u0645 \u062E\u0648\u0628 \u0634\u06CC\u0631\u0627\u0632 \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F',
    expectedSlug: 'mobile-phone',
    acceptParents: ['mobile-tablet'],
    cityName: '\u0634\u06CC\u0631\u0627\u0632',
  },
  {
    id: 'macbook-sale',
    text: '\u0644\u067E\u200C\u062A\u0627\u067E \u0645\u0627\u06A9\u200C\u0628\u0648\u06A9 \u0627\u06CC\u0631 \u0645\u06F1 \u0628\u0627 \u06F3\u06F8 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0645\u06CC\u0641\u0631\u0648\u0634\u0645 \u062A\u0647\u0631\u0627\u0646',
    expectedSlug: 'laptop',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'ps5-bundle',
    text: '\u062F\u0646\u0628\u0627\u0644 \u067E\u0644\u06CC\u200C\u0627\u0633\u062A\u06CC\u0634\u0646 \u06F5 \u0628\u0627 \u062F\u0648 \u062F\u0633\u062A\u0647 \u062A\u0628\u0631\u06CC\u0632',
    expectedSlug: 'game-console',
    cityName: '\u062A\u0628\u0631\u06CC\u0632',
  },
  {
    id: 'rolex-daytona',
    text: '\u0633\u0627\u0639\u062A \u0631\u0648\u0644\u06A9\u0633 \u062F\u06CC\u062A\u0648\u0646\u0627 \u0627\u0635\u0644 \u0628\u0627 \u062C\u0639\u0628\u0647 \u0627\u0635\u0627\u0644\u062A \u0645\u06CC\u062E\u0631\u0645',
    expectedSlug: 'jewelry-watches',
  },
  {
    id: 'fridge-side-by-side',
    text: '\u06CC\u062E\u0686\u0627\u0644 \u0633\u0627\u06CC\u062F \u0628\u0627\u06CC \u0633\u0627\u06CC\u062F \u0633\u0627\u0645\u0633\u0648\u0646\u06AF \u062F\u0648\u0633\u0627\u0644\u0647 \u0646\u0648 \u0627\u0633\u062A \u062A\u0647\u0631\u0627\u0646',
    expectedSlug: 'refrigerator',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'washing-machine-ahvaz',
    text: '\u0645\u0627\u0634\u06CC\u0646 \u0644\u0628\u0627\u0633\u0634\u0648\u06CC\u06CC \u0627\u062A\u0648\u0645\u0627\u062A \u0632\u06CC\u0631 \u06F1\u06F2 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u0647\u0648\u0627\u0632',
    expectedSlug: 'washing-machine',
    cityName: '\u0627\u0647\u0648\u0627\u0632',
  },
  {
    id: 'plumber-leak',
    text: '\u0644\u0648\u0644\u0647 \u062E\u0648\u0631\u062F\u0647 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u0631\u0627 \u062A\u0645\u0631\u06CC\u0646 \u062F\u0627\u0631\u0645 \u0627\u0645\u0631\u0648\u0632 \u062A\u0647\u0631\u0627\u0646',
    expectedSlug: 'plumbing',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'moving-tehran-karaj',
    text: '\u0627\u0633\u0628\u0627\u0628 \u06A9\u0634\u06CC \u0627\u0632 \u062A\u0647\u0631\u0627\u0646 \u0628\u0647 \u06A9\u0631\u062C \u0633\u0647 \u062E\u0648\u0627\u0628\u0647 \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647',
    expectedSlug: 'moving',
  },
  {
    id: 'electrician-shop',
    text: '\u0628\u0631\u0642\u200C\u06A9\u0627\u0631 \u0628\u0631\u0627\u06CC \u0633\u06CC\u0645\u200C\u06A9\u0634\u06CC \u0645\u063A\u0627\u0632\u0647 \u062C\u062F\u06CC\u062F \u0627\u0635\u0641\u0647\u0627\u0646',
    expectedSlug: 'electrical',
    cityName: '\u0627\u0635\u0641\u0647\u0627\u0646',
  },
  {
    id: 'cleaning-rasht',
    text: '\u0646\u0638\u0627\u0641\u062A \u0639\u0645\u06CC\u0642 \u062E\u0627\u0646\u0647 \u06F1\u06F5\u06F0 \u0645\u062A\u0631\u06CC \u0631\u0634\u062A \u0647\u0641\u062A\u0647 \u0628\u0639\u062F \u0639\u0635\u0631',
    expectedSlug: 'cleaning',
    cityName: '\u0631\u0634\u062A',
  },
  {
    id: 'math-tutor',
    text: '\u0645\u0639\u0644\u0645 \u0631\u06CC\u0627\u0636\u06CC \u062E\u0635\u0648\u0635\u06CC \u0628\u0631\u0627\u06CC \u06A9\u0646\u06A9\u0648\u0631 \u062A\u0647\u0631\u0627\u0646 \u0634\u0645\u0627\u0631\u0647 \u06F9\u06F1\u06F2',
    expectedSlug: 'education',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'winter-coat',
    text: '\u067E\u0627\u0644\u062A\u0648 \u0645\u0631\u062F\u0648\u0646\u0647 \u0627\u0635\u0644 \u0633\u0627\u06CC\u0632 L \u062A\u0642\u0631\u06CC\u0628\u0627 \u0627\u0633\u062A \u0645\u06CC\u0641\u0631\u0648\u0634\u0645',
    expectedSlug: 'clothing',
  },
  {
    id: 'persian-cat',
    text: '\u0628\u0686\u0647 \u06AF\u0631\u0628\u0647 \u0641\u0631\u0648\u0634 \u0648\u0627\u06CC\u0632\u0646\u0647 \u0634\u062F\u0647 \u0642\u0645',
    expectedSlug: 'pets',
    cityName: '\u0642\u0645',
  },
  {
    id: 'react-hiring',
    text: '\u0634\u0631\u06A9\u062A \u0646\u0631\u0645\u200C\u0627\u0641\u0632\u0627\u0631 \u0627\u0633\u062A\u0645\u0627\u06CC\u0639 \u062A\u0648\u0644\u06CC\u062F \u0641\u0631\u0627\u0646\u062A\u200C\u0627\u0646\u062F \u062A\u0647\u0631\u0627\u0646',
    expectedSlug: 'it',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'civil-engineer',
    text: '\u0645\u0647\u0646\u062F\u0633 \u0639\u0645\u0631\u0627\u0646 \u0633\u0627\u062E\u062A\u0645\u0627\u0646\u06CC \u0628\u0627 \u06F5 \u0633\u0627\u0644 \u0633\u0627\u0628\u0642\u0647 \u0645\u0634\u0647\u062F',
    expectedSlug: 'engineering',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'lost-wallet',
    text: '\u06A9\u0627\u0631\u062A \u0628\u0627\u0646\u06A9\u06CC \u0648 \u06A9\u062F \u0645\u0644\u06CC \u0631\u0627 \u062F\u0631 \u0645\u062A\u0631\u0648 \u0648\u0646\u06A9 \u06AF\u0645 \u06A9\u0631\u062F\u0645',
    expectedSlug: 'lost-found',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'conference-ticket',
    text: '\u062F\u0648 \u0628\u0644\u06CC\u062A \u0647\u0645\u0627\u06CC\u0634 \u0628\u0627\u0646\u06A9\u062F\u0627\u0631\u06CC \u062A\u0647\u0631\u0627\u0646 \u0645\u06CC\u062E\u0631\u0645',
    expectedSlug: 'conference',
    acceptParents: ['tickets', 'social'],
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'office-rent-vanak',
    text: '\u062F\u0641\u062A\u0631 \u06F8\u06F0 \u0645\u062A\u0631\u06CC \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646 \u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u06CC\u0627\u0646\u0647 \u06F2\u06F5 \u0645\u06CC\u0644\u06CC\u0648\u0646',
    expectedSlug: 'office-rent',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'industrial-warehouse',
    text: '\u0633\u0648\u0644\u0647 \u06F2\u06F0\u06F0\u06F0 \u0645\u062A\u0631\u06CC \u0635\u0646\u0639\u062A\u06CC \u0627\u0647\u0648\u0627\u0632 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647',
    expectedSlug: 'industrial-rent',
    cityName: '\u0627\u0647\u0648\u0627\u0632',
  },
  {
    id: 'boat-leisure',
    text: '\u0642\u0627\u06CC\u0642 \u062A\u0641\u0631\u06CC\u062D\u06CC \u062F\u0648\u0646\u06A9\u0634\u062A\u06CC \u0628\u0646\u062F\u0631 \u0639\u0628\u0627\u0633 \u0645\u06CC\u062E\u0631\u0645',
    expectedSlug: 'boat',
  },
  {
    id: 'spare-parts-pride',
    text: '\u0642\u0637\u0639\u0647 \u06CC\u062F\u06A9\u06CC \u067E\u0631\u0627\u06CC\u062F \u062C\u0644\u0648 \u0639\u0642\u0628 \u0645\u062F\u0644 \u06F8\u06F6',
    expectedSlug: 'spare-parts',
  },
  {
    id: 'camera-canon',
    text: '\u062F\u0648\u0631\u0628\u06CC\u0646 \u06A9\u0627\u0646\u0646 \u062F\u06CC \u06F7\u06F0\u06F0 \u0628\u0627 \u0644\u0646\u0632 \u06F2\u06F4\u06F7\u06F0 \u062F\u0633\u062A \u062F\u0648\u0645 \u0645\u06CC\u0641\u0631\u0648\u0634\u0645',
    expectedSlug: 'camera',
  },
  {
    id: 'sofa-set',
    text: '\u0645\u0628\u0644 \u06F7\u06F7 \u0646\u0641\u0631\u0647 \u0686\u0631\u0645 \u0627\u0635\u0644 \u062A\u0647\u0631\u0627\u0646 \u062A\u062D\u0648\u06CC\u0644',
    expectedSlug: 'sofa-chair',
    cityName: '\u062A\u0647\u0631\u0627\u0646',
  },
  {
    id: 'painting-wallpaper',
    text: '\u0646\u0642\u0627\u0634 \u0633\u0627\u062E\u062A\u0645\u0627\u0646 \u0648 \u0646\u0635\u0628 \u06A9\u0627\u063A\u0630 \u062F\u06CC\u0648\u0627\u0631\u06CC \u0645\u0634\u0647\u062F',
    expectedSlug: 'painting',
    cityName: '\u0645\u0634\u0647\u062F',
  },
  {
    id: 'violin-student',
    text: '\u0648\u06CC\u0648\u0644\u0646 \u062F\u0633\u062A \u062F\u0648\u0645 \u0628\u0631\u0627\u06CC \u062F\u062E\u062A\u0631 \u0645\u0648\u0633\u06CC\u0642\u06CC \u062A\u0628\u0631\u06CC\u0632 \u0645\u06CC\u062E\u0631\u0645',
    expectedSlug: 'musical-instruments',
    cityName: '\u062A\u0628\u0631\u06CC\u0632',
  },
];

function slugMatches(actual: string, expected: string, acceptParents: string[] = []): boolean {
  if (actual === expected) return true;
  const path = getCategoryPath(actual).map((c) => c.slug);
  if (path.includes(expected)) return true;
  for (const p of acceptParents) {
    if (actual === p || path.includes(p)) return true;
  }
  const expectedPath = getCategoryPath(expected).map((c) => c.slug);
  return expectedPath.includes(actual);
}

function titleLooksBad(title: string, _sourceText: string): string | null {
  if (!title.trim()) return 'empty_title';
  if (title.includes('\u0645\u0646 \u06CC\u06A9 ') || title.includes('\u0633\u0627\u06A9\u0646 \u0647\u0633\u062A\u0645')) {
    return 'verbatim_user_sentence';
  }
  if (title.length > 80) return 'title_too_long';
  return null;
}

async function analyzeCase(c: BatchCase): Promise<{
  gotSlug: string;
  title: string;
  draft?: NeedDraft;
  httpError?: string;
}> {
  const useHttp = process.env.INTAKE_BATCH_USE_HTTP === '1';
  if (useHttp) {
    const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/intake/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: c.text,
        ...(c.cityName ? { cityName: c.cityName } : {}),
      }),
    });
    if (!res.ok) {
      return { gotSlug: `HTTP ${res.status}`, title: '', httpError: 'analyze_failed' };
    }
    const data = (await res.json()) as {
      entities?: { categorySlug?: string; subcategorySlug?: string };
      draft?: NeedDraft;
    };
    const got =
      data.entities?.subcategorySlug ??
      data.entities?.categorySlug ??
      data.draft?.entities?.subcategorySlug ??
      data.draft?.entities?.categorySlug ??
      '?';
    const gotSlug = typeof got === 'string' ? got : String(got);
    const title = data.draft ? resolveDeterministicListingTitle(data.draft).title : '';
    return { gotSlug, title, draft: data.draft };
  }

  const result = await runIntakeIntelligence(
    { text: c.text, cityName: c.cityName, forceAi: false },
    { skipCache: true }
  );
  const gotSlug = String(
    result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value ?? '?'
  );
  const title = resolveDeterministicListingTitle(result.draft).title;
  return { gotSlug, title, draft: result.draft };
}

async function main(): Promise<void> {
  clearIntelligenceCache();
  const results: Array<{
    id: string;
    ok: boolean;
    text: string;
    expected: string;
    got: string;
    title: string;
    issues: string[];
  }> = [];

  for (const c of CASES) {
    const issues: string[] = [];
    const { gotSlug, title, draft, httpError } = await analyzeCase(c);
    if (httpError) {
      results.push({
        id: c.id,
        ok: false,
        text: c.text,
        expected: c.expectedSlug,
        got: gotSlug,
        title: '',
        issues: [httpError],
      });
      continue;
    }

    const catOk = slugMatches(gotSlug, c.expectedSlug, c.acceptParents ?? []);

    if (!catOk) issues.push(`category:${gotSlug}!=${c.expectedSlug}`);
    const titleIssue = title ? titleLooksBad(title, c.text) : draft ? 'no_draft_title' : 'no_draft_title';
    if (titleIssue && titleIssue !== 'no_draft_title') issues.push(titleIssue);

    results.push({
      id: c.id,
      ok: catOk && !titleIssue,
      text: c.text,
      expected: c.expectedSlug,
      got: gotSlug,
      title,
      issues,
    });
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log(`\nreal-user-intake-batch: ${ok}/${results.length} OK\n`);
  for (const r of results) {
    const mark = r.ok ? 'OK' : 'FAIL';
    console.log(`[${mark}] ${r.id}`);
    console.log(`  text: ${r.text.slice(0, 70)}${r.text.length > 70 ? '…' : ''}`);
    console.log(`  category: ${r.got} (expected ${r.expected})`);
    console.log(`  title: ${r.title || '—'}`);
    if (r.issues.length) console.log(`  issues: ${r.issues.join(', ')}`);
  }

  const reportDir = join(process.cwd(), 'reports');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `real-user-intake-batch-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify({ ok, total: results.length, results }, null, 2));
  console.log(`\nReport: ${reportPath}`);

  const minRate = Number(process.env.RULES_BATCH_MIN_RATE ?? 90);
  const rate = Math.round((ok / results.length) * 1000) / 10;
  console.log(`pass rate: ${rate}% (min ${minRate}%)`);

  process.exit(rate >= minRate ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
