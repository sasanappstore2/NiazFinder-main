/**
 * Golden scenarios for Need Assessment Engine (rules layers).
 */
import type { NeedDraft, ListingPreview } from '@/contracts/need-intake';
import { assessNeedDraft } from '@/intake/assessment/need-assessment-engine';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ok ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
}

function baseDraft(overrides: Partial<NeedDraft> = {}): NeedDraft {
  return {
    templateId: 'residential-rent',
    templateVersion: 1,
    sourceText:
      '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0645\u0634\u0647\u062F \u0633\u062C\u0627\u062F',
    entities: {
      categorySlug: 'apartment-rent',
      subcategorySlug: 'apartment-rent',
      city: '\u0645\u0634\u0647\u062F',
      dealType: 'rent_rahn_ejare',
      budgetMin: '500000000',
      budgetMax: '8000000',
      monthlyRent: '8000000',
      rahnAmount: '500000000',
    },
    answers: {
      dealType: 'rent_rahn_ejare',
      budgetMin: 500000000,
      budgetMax: 8000000,
      monthlyRent: 8000000,
      rahnAmount: 500000000,
    },
    parsedIntent: {
      intentType: 'property_search',
      categorySlug: 'apartment-rent',
      city: '\u0645\u0634\u0647\u062F',
      confidence: 0.8,
      entities: {},
    },
    completionScore: 70,
    completionState: 'IN_PROGRESS',
    ...overrides,
  } as NeedDraft;
}

async function runScenario(
  name: string,
  draft: NeedDraft,
  preview: ListingPreview | null,
  checks: (report: Awaited<ReturnType<typeof assessNeedDraft>>) => void
) {
  console.log(`\n[${name}]`);
  const report = await assessNeedDraft(
    { draft, listingPreview: preview },
    undefined,
    { forceRulesOnly: true }
  );
  checks(report);
}

async function main() {
  console.log('Need Assessment Engine golden self-test');

  await runScenario(
    'rent title says sell',
    baseDraft(),
    {
      title:
        '\u0641\u0631\u0648\u0634 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u2014 \u0645\u0634\u0647\u062F',
      description:
        '\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u06A9\u0627\u0641\u06CC \u0628\u0631\u0627\u06CC \u0622\u06AF\u0647\u06CC \u0628\u0627 \u062C\u0632\u0626\u06CC\u0627\u062A \u0628\u06CC\u0634\u062A\u0631',
    },
    (r) => {
      assert(
        r.gaps.some((g) => g.id === 'semantic:deal-title-sell-vs-rent'),
        'detects rent vs sell title contradiction'
      );
      assert(r.blockingGapCount > 0, 'has blocking gaps');
      assert(!r.canPublish, 'blocks publish on contradiction');
    }
  );

  await runScenario(
    'budget min=max with separate rents in dedicated fields',
    baseDraft({
      entities: {
        categorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        dealType: 'rent_rahn_ejare',
        budgetMin: '500000000',
        budgetMax: '500000000',
        monthlyRent: '8000000',
        rahnAmount: '500000000',
      },
      answers: {
        dealType: 'rent_rahn_ejare',
        budgetMin: 500000000,
        budgetMax: 500000000,
        monthlyRent: 8000000,
        rahnAmount: 500000000,
      },
    }),
    null,
    (r) => {
      assert(
        !r.gaps.some((g) => g.id === 'semantic:budget-duplicate-rent'),
        'no duplicate-budget gap when rahn and monthlyRent are set separately'
      );
    }
  );

  await runScenario(
    'budget min=max without dedicated rent fields',
    baseDraft({
      entities: {
        categorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        dealType: 'rent_rahn_ejare',
        budgetMin: '500000000',
        budgetMax: '500000000',
      },
      answers: {
        dealType: 'rent_rahn_ejare',
        budgetMin: 500000000,
        budgetMax: 500000000,
        monthlyRent: 8000000,
        rahnAmount: 500000000,
      },
    }),
    null,
    (r) => {
      assert(
        !r.gaps.some((g) => g.id === 'semantic:budget-duplicate-rent'),
        'no gap when canonical rahn/monthly fields differ'
      );
    }
  );

  await runScenario(
    'budget min=max collapsed with same rahn and monthly',
    baseDraft({
      entities: {
        categorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        dealType: 'rent_rahn_ejare',
        budgetMin: '500000000',
        budgetMax: '500000000',
        monthlyRent: '500000000',
        rahnAmount: '500000000',
      },
      answers: {
        dealType: 'rent_rahn_ejare',
        budgetMin: 500000000,
        budgetMax: 500000000,
        monthlyRent: 500000000,
        rahnAmount: 500000000,
      },
    }),
    null,
    (r) => {
      assert(
        !r.gaps.some((g) => g.id === 'semantic:budget-duplicate-rent'),
        'same rahn/monthly is not the duplicate-range case'
      );
    }
  );

  await runScenario(
    'neighbor kind not location',
    baseDraft({
      sourceText:
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u0628\u0627 \u0647\u0645\u0633\u0627\u06CC\u0647 \u0645\u0647\u0631\u0628\u0627\u0646 \u062F\u0631 \u0645\u0634\u0647\u062F',
      entities: {
        categorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        neighborhood: '\u0645\u0647\u0631\u0628\u0627\u0646',
        dealType: 'rent_rahn_ejare',
      },
    }),
    null,
    (r) => {
      assert(
        r.gaps.some((g) => g.id === 'semantic:neighbor-not-location'),
        'flags neighbor adjective as uncertain location'
      );
    }
  );

  await runScenario(
    'neighborhood without city',
    baseDraft({
      entities: {
        categorySlug: 'apartment-rent',
        neighborhood: '\u0633\u062C\u0627\u062F',
      },
      answers: { dealType: 'rent_rahn_ejare' },
      parsedIntent: {
        intentType: 'property_search',
        categorySlug: 'apartment-rent',
        confidence: 0.8,
        entities: {},
      },
    }),
    null,
    (r) => {
      assert(
        r.gaps.some((g) => g.id === 'location:neighborhood-without-city'),
        'neighborhood without city gap'
      );
    }
  );

  await runScenario(
    'generic listing title',
    baseDraft(),
    {
      title: '\u062B\u0628\u062A \u0646\u06CC\u0627\u0632',
      description:
        '\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0622\u06AF\u0647\u06CC \u0628\u0627 \u062D\u062F\u0627\u0642\u0644 \u0637\u0648\u0644 \u0644\u0627\u0632\u0645 \u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u0634\u0627\u0631',
    },
    (r) => {
      assert(r.gaps.some((g) => g.id === 'listing:generic-title'), 'flags generic title');
    }
  );

  await runScenario(
    'rules-only score cap',
    baseDraft({
      sourceText:
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u06A9\u0627\u0645\u0644 \u062F\u0648 \u062E\u0648\u0627\u0628 \u06F1\u06F2\u06F0 \u0645\u062A\u0631\u06CC \u062F\u0631 \u0645\u0634\u0647\u062F \u0633\u062C\u0627\u062F',
      answers: {
        dealType: 'rent_rahn_ejare',
        details:
          '\u0637\u0628\u0642\u0647 \u0628\u0627\u0644\u0627\u060C \u067E\u0627\u0631\u06A9\u06CC\u0646\u06AF\u060C \u0627\u0646\u0628\u0627\u0631\u06CC',
      },
      entities: {
        categorySlug: 'apartment-rent',
        subcategorySlug: 'apartment-rent',
        city: '\u0645\u0634\u0647\u062F',
        neighborhood: '\u0633\u062C\u0627\u062F',
        dealType: 'rent_rahn_ejare',
        budgetMin: '500000000',
        budgetMax: '8000000',
        monthlyRent: '8000000',
        rahnAmount: '500000000',
      },
    }),
    {
      title:
        '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u06F2 \u062E\u0648\u0627\u0628 \u2014 \u0645\u0634\u0647\u062F \u0633\u062C\u0627\u062F',
      description:
        '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0645\u062D\u062F\u0648\u062F\u0647 \u0633\u062C\u0627\u062F',
    },
    (r) => {
      assert(r.score <= 85, `rules-only cap: score=${r.score}`);
      assert(r.provenance === 'rules', 'provenance rules');
    }
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
