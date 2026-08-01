/**
 * Phase 1 self-test for the Cognitive Contract (RFC-002 Parts 2 & 11).
 *
 * Note on scope, corrected from the original plan draft: this does NOT assert the new
 * Evidence layer reproduces `ParsedIntent.entities` losslessly — `ParsedIntent.entities`
 * already contains business-decided values (category slugs, deal types), and per ADR-005
 * Evidence must never contain business meaning. Comparing the two 1:1 would validate the
 * wrong thing. Instead this test operationalizes the actual RFC requirements directly:
 * structural conformance (Zod), traceability (sourceSpan must appear in the input text),
 * and the ADR-005 business-meaning ban — plus a loose semantic sanity check per fixture.
 *
 * Requires a live local LLM (same one /post uses). Run via: npm run test:cognitive-evidence
 */
import { extractEvidenceViaAdapter } from '@/cognitive-engine/adapters/openai-compatible-adapter';
import { evidenceListSchema, violatesBusinessMeaningRule } from '@/cognitive-engine/types/evidence';

interface Fixture {
  id: string;
  text: string;
  /** At least one evidence item's value or sourceSpan should relate to this keyword. */
  expectMention: string;
}

const FIXTURES: Fixture[] = [
  {
    id: 'gearbox-broken',
    text: 'ماشینم گیربکسش خراب شده، میخوام عوضش کنم',
    expectMention: 'گیربکس',
  },
  {
    id: 'ps5-shiraz-urgent',
    text: 'یه پلی استیشن ۵ دست دوم میخوام تو شیراز فوری',
    expectMention: 'پلی استیشن',
  },
  {
    id: 'apartment-rent-budget',
    text: 'دنبال یه آپارتمان دو خوابه اجاره‌ای تو سعادت‌آباد هستم، ودیعه تا ۵۰۰ میلیون',
    expectMention: 'آپارتمان',
  },
  {
    id: 'laptop-preference',
    text: 'لپ تاپ گیمینگ میخوام، ترجیحاً ایسوس باشه',
    expectMention: 'لپ تاپ',
  },
];

async function runFixture(f: Fixture): Promise<string[]> {
  const errors: string[] = [];
  const result = await extractEvidenceViaAdapter(f.text);

  if (!result) {
    errors.push(`${f.id}: adapter returned null`);
    return errors;
  }

  if (result.diagnostics.parsingStatus !== 'ok') {
    errors.push(`${f.id}: parsingStatus=${result.diagnostics.parsingStatus} (evidence unusable)`);
    return errors;
  }

  if (result.evidence.length === 0) {
    errors.push(`${f.id}: zero evidence items extracted`);
    return errors;
  }

  const structural = evidenceListSchema.safeParse(result.evidence);
  if (!structural.success) {
    errors.push(`${f.id}: schema validation failed — ${structural.error.message}`);
  }

  for (const item of result.evidence) {
    if (!f.text.includes(item.sourceSpan)) {
      errors.push(
        `${f.id}: evidence ${item.id} sourceSpan "${item.sourceSpan}" is not a substring of the input text (traceability violated)`
      );
    }
    if (violatesBusinessMeaningRule(item)) {
      errors.push(
        `${f.id}: evidence ${item.id} value "${item.value}" looks like a business slug (ADR-005 violation)`
      );
    }
  }

  const mentioned = result.evidence.some(
    (item) => item.value.includes(f.expectMention) || item.sourceSpan.includes(f.expectMention)
  );
  if (!mentioned) {
    errors.push(`${f.id}: no evidence item mentions expected keyword "${f.expectMention}"`);
  }

  return errors;
}

export async function runEvidenceContractSelfTest(): Promise<{ passed: number; failed: string[] }> {
  const failed: string[] = [];
  for (const f of FIXTURES) {
    failed.push(...(await runFixture(f)));
  }
  return { passed: FIXTURES.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-evidence-contract-self-test'));

if (isDirectRun) {
  runEvidenceContractSelfTest().then(({ passed, failed }) => {
    if (failed.length) {
      console.error('Evidence contract self-test FAILED:\n', failed.join('\n'));
      process.exit(1);
    }
    console.log(`Evidence contract self-test OK: ${passed}/${FIXTURES.length}`);
  });
}
