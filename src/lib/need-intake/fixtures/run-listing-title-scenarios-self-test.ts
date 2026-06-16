/**
 * Cross-vertical listing title invariants — not one-off ad fixes.
 */
import type { IntakeEntities } from '@/intake/types';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { getIntakeIndexes } from '@/intake/dictionaries/loader';
import {
  createNeedDraftFromAnalysis,
  entitiesToRecord,
  legacyNeedDraftFromParsed,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { enrichIntakeAnalysisLocation } from '@/lib/need-intake/enrich-intake-analysis-location.server';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { generateListingTitle } from '@/lib/need-intake/generate-listing-title';
import {
  dedupeRedundantDealPhrases,
  isAcceptableListingTitle,
  rejectListingTitleReason,
} from '@/lib/need-intake/listing-title-sanitize';
import { resolveDeterministicListingTitle, mergeListingTitleWithAi } from '@/lib/need-intake/resolve-listing-title';
import { POST_ESTATE_SCENARIO_MATRIX } from '@/lib/need-intake/fixtures/post-estate-scenario-matrix';

function assert(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

function assertTitleInvariants(title: string, sourceText: string, label: string): string[] {
  const failed: string[] = [];
  const ctx = { sourceText };
  failed.push(assert(title.length >= 10, `${label}: too short (${title})`) ?? '');
  failed.push(assert(!/برای\s+اجاره\s*$/u.test(title) || !/^اجاره/u.test(title), `${label}: duplicate rent`) ?? '');
  failed.push(assert(rejectListingTitleReason(title, ctx) !== 'generic_deal_city_only', `${label}: deal+city only`) ?? '');
  failed.push(assert(rejectListingTitleReason(title, ctx) !== 'verbatim_copy', `${label}: verbatim copy`) ?? '');
  return failed.filter(Boolean);
}

async function testEstateMatrixTitles(): Promise<string[]> {
  const failed: string[] = [];
  process.env.NEED_INTAKE_TITLE_AI_ENABLED = 'false';
  const indexes = await getIntakeIndexes();

  for (const scenario of POST_ESTATE_SCENARIO_MATRIX.slice(0, 12)) {
    const analyzeOptions = {
      preferredCitySlug: scenario.preferredCitySlug,
      preferredCityName: scenario.preferredCityName,
    };
    const raw = analyzeNeedText(scenario.text, indexes, analyzeOptions);
    const analysis = enrichIntakeAnalysisLocation(raw, scenario.text, analyzeOptions);
    const scenarioErr = scenario.assert(analysis);
    if (scenarioErr) {
      failed.push(`${scenario.id}: analysis ${scenarioErr}`);
      continue;
    }

    let draft = createNeedDraftFromAnalysis(analysis, scenario.text);
    draft = recomputeNeedDraft(draft);
    const title = resolveDeterministicListingTitle(draft).title;
    failed.push(...assertTitleInvariants(title, scenario.text, scenario.id));
    failed.push(assert(/متر|آپارتمان|زمین|ویلا|دفتر|مغازه|خانه/u.test(title), `${scenario.id}: missing subject`) ?? '');
  }

  return failed.filter(Boolean);
}

function testDeterministicPaths(): string[] {
  const failed: string[] = [];

  failed.push(
    assert(
      dedupeRedundantDealPhrases('اجاره آپارتمان ۱۹۰ متری در صیاد برای اجاره') ===
        'اجاره آپارتمان ۱۹۰ متری در صیاد',
      'dedupe rent suffix'
    ) ?? ''
  );

  const rentText = 'اجاره آپارتمان ۱۹۰ متری در صیاد برای اجاره';
  const parsed = enrichParsedIntent(parseIntentFromText(rentText));
  const answers = seedAnswersFromParsed(parsed);
  let rentDraft = legacyNeedDraftFromParsed(parsed, answers);
  rentDraft.sourceText = rentText;
  rentDraft = recomputeNeedDraft(rentDraft);
  const rentTitle = resolveDeterministicListingTitle(rentDraft).title;
  failed.push(assert(rentTitle.includes('190') || rentTitle.includes('۱۹۰'), 'rent: area in title') ?? '');
  failed.push(assert(!rentTitle.includes('برای اجاره'), 'rent: no duplicate deal') ?? '');

  const carParsed = enrichParsedIntent(parseIntentFromText('یک کارواش در حد نو میخوام'));
  let carDraft = legacyNeedDraftFromParsed(
    { ...carParsed, city: 'مشهد', categorySlug: 'car-ride', intentType: 'vehicle_search' },
    { dealType: 'buy', location: 'مشهد' }
  );
  carDraft.sourceText = 'یک کارواش در حد نو میخوام';
  carDraft.entities = entitiesToRecord({
    categorySlug: 'car-ride',
    vertical: 'vehicles',
    city: 'مشهد',
    transactionType: 'BUY',
  } as IntakeEntities);
  carDraft = recomputeNeedDraft(carDraft);
  const carTitle = composeListingFromDraft(carDraft).title;
  failed.push(assert(carTitle.includes('کارواش'), 'vehicle: subject in title') ?? '');
  failed.push(assert(isAcceptableListingTitle(carTitle, { sourceText: carDraft.sourceText }), 'vehicle: acceptable') ?? '');

  return failed.filter(Boolean);
}

async function testAiNeverWorsensDeterministic(): Promise<string[]> {
  const failed: string[] = [];
  const prevAi = process.env.NEED_INTAKE_TITLE_AI_ENABLED;
  process.env.NEED_INTAKE_TITLE_AI_ENABLED = 'false';

  try {
    const text = 'آپارتمان دو خواب برای خرید در فرامرز عباسی مشهد بودجه ۱۰ میلیارد';
    const parsed = enrichParsedIntent(parseIntentFromText(text));
    let draft = legacyNeedDraftFromParsed(parsed, seedAnswersFromParsed(parsed));
    draft.sourceText = text;
    draft = recomputeNeedDraft(draft);
    const deterministic = resolveDeterministicListingTitle(draft).title;
    const badAi = 'اجاره آپارتمان ۱۹۰ متری در صیاد برای اجاره';
    const gen = await generateListingTitle(draft, deterministic);
    failed.push(assert(gen.source === 'template', 'ai off: template source') ?? '');
    failed.push(assert(gen.title === deterministic, 'ai off: deterministic unchanged') ?? '');
    failed.push(assert(isAcceptableListingTitle(deterministic, { sourceText: text }), 'deterministic acceptable') ?? '');
    failed.push(
      assert(
        mergeListingTitleWithAi(draft, badAi) === deterministic,
        'mergeListingTitleWithAi keeps deterministic over bad ai'
      ) ?? ''
    );
  } finally {
    if (prevAi === undefined) delete process.env.NEED_INTAKE_TITLE_AI_ENABLED;
    else process.env.NEED_INTAKE_TITLE_AI_ENABLED = prevAi;
  }

  return failed.filter(Boolean);
}

export async function runListingTitleScenariosSelfTest(): Promise<{
  passed: number;
  failed: string[];
}> {
  const failed = [
    ...testDeterministicPaths(),
    ...(await testEstateMatrixTitles()),
    ...(await testAiNeverWorsensDeterministic()),
  ];
  const total = 6 + POST_ESTATE_SCENARIO_MATRIX.slice(0, 12).length * 5 + 4;
  return { passed: total - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-listing-title-scenarios-self-test'));

if (isDirectRun) {
  runListingTitleScenariosSelfTest().then(({ passed, failed }) => {
    if (failed.length) {
      console.error('listing-title-scenarios FAILED');
      for (const f of failed) console.error(' -', f);
      process.exit(1);
    }
    console.log(`listing-title-scenarios OK (${passed} checks)`);
  });
}
