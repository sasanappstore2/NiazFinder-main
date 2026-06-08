/**
 * Run post golden matrix against post-pipeline-harness.
 * Run: npm run test:post-pipeline
 */
import {
  assertAiCopyGuard,
  assertTitleExpertReadable,
  draftMoneySnapshot,
  runPostPipeline,
} from '@/lib/need-intake/fixtures/post-pipeline-harness';
import {
  POST_GOLDEN_MATRIX,
  type PostGoldenScenario,
} from '@/lib/need-intake/fixtures/post-golden-matrix';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

function assertScenario(scenario: PostGoldenScenario): string[] {
  const failed: string[] = [];
  const result = runPostPipeline(scenario.input);
  const money = draftMoneySnapshot(result.draft);
  const entities = recordToEntities(result.draft.entities);
  const { expect: e } = scenario;

  if (e.dealType && money.dealType !== e.dealType) {
    failed.push(`dealType: got ${money.dealType} expected ${e.dealType}`);
  }
  if (e.transactionType && entities.transactionType !== e.transactionType) {
    failed.push(`transactionType: got ${entities.transactionType} expected ${e.transactionType}`);
  }
  if (e.city && entities.city !== e.city) {
    failed.push(`city: got ${entities.city} expected ${e.city}`);
  }
  if (e.rahnAmount != null && money.rahnAmount !== e.rahnAmount) {
    failed.push(`rahnAmount: got ${money.rahnAmount} expected ${e.rahnAmount}`);
  }
  if (e.monthlyRent != null && money.monthlyRent !== e.monthlyRent) {
    failed.push(`monthlyRent: got ${money.monthlyRent} expected ${e.monthlyRent}`);
  }
  if (e.budgetMin != null && (money.budget ?? 0) < e.budgetMin) {
    failed.push(`budget: got ${money.budget} expected >= ${e.budgetMin}`);
  }
  if (e.categoryIncludes) {
    const slug = `${entities.categorySlug ?? ''}${entities.subcategorySlug ?? ''}`;
    if (!slug.includes(e.categoryIncludes)) {
      failed.push(`category slug missing ${e.categoryIncludes}: ${slug}`);
    }
  }

  const titleErr = assertTitleExpertReadable(result, {
    minLength: ['vehicle', 'vertical'].includes(scenario.group) ? 5 : 10,
    mustInclude: e.titleIncludes,
    mustNotInclude: e.titleExcludes,
    skipSanitize: ['vertical', 'vehicle', 'edge'].includes(scenario.group),
  });
  if (titleErr) failed.push(titleErr);

  if (e.badAiTitle) {
    const guardErr = assertAiCopyGuard(
      result.title,
      e.badAiTitle,
      result.draft.sourceText,
      result.copyContext.dealTypeFa,
      'فروش مغازه در سجاد با شرایط عالی'
    );
    if (guardErr) failed.push(guardErr);
  }

  if (e.publishWhenComplete && !result.publishValid) {
    failed.push(`publish invalid: ${result.publishErrors.join('; ')}`);
  }

  return failed;
}

export function runPostGoldenMatrixSelfTest(): {
  total: number;
  passed: number;
  failed: string[];
  assertionCount: number;
} {
  const failed: string[] = [];
  let assertionCount = 0;
  for (const scenario of POST_GOLDEN_MATRIX) {
    const errs = assertScenario(scenario);
    assertionCount += 8;
    if (errs.length) {
      failed.push(`${scenario.id}: ${errs.join(' | ')}`);
    }
  }
  return {
    total: POST_GOLDEN_MATRIX.length,
    passed: POST_GOLDEN_MATRIX.length - failed.length,
    failed,
    assertionCount,
  };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-post-pipeline-self-test'));

if (isDirectRun) {
  const { total, passed, failed, assertionCount } = runPostGoldenMatrixSelfTest();
  console.log(
    `post-pipeline: ${passed}/${total} scenarios OK (~${assertionCount} assertions)`
  );
  if (failed.length) {
    console.error(failed.slice(0, 30).join('\n'));
    if (failed.length > 30) console.error(`... +${failed.length - 30} more`);
    process.exit(1);
  }
}

export { runPostGoldenMatrixSelfTest as runPostPipelineSelfTest };
