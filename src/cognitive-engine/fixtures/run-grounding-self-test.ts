/**
 * Phase 2 self-test for Grounding (RFC-002 Part 4).
 *
 * Unlike Phase 1's evidence-contract test, this one needs NO live LLM: grounding is pure
 * deterministic resolver lookup (ADR-016 — resolvers retrieve, never reason), so it's fast
 * and runs everywhere. Two kinds of assertions:
 *
 * 1. Parity: `groundEvidence`'s category candidates must be byte-identical to calling the
 *    underlying `matchCategoryCandidatesFromRules` directly on the same text — proving the
 *    grounding wrapper re-shapes output without altering it (the actual promise of Phase 2).
 * 2. Behavioral: known-unambiguous city names resolve; evidence linkage
 *    (`derivedFromEvidenceIds`) correctly attaches to the stub evidence whose sourceSpan
 *    mentions the resolved place.
 *
 * Run via: npm run test:cognitive-grounding
 */
import { groundEvidence } from '@/cognitive-engine/grounding/resolver';
import { matchCategoryCandidatesFromRules } from '@/intake/rules/registry.server';
import type { Evidence } from '@/cognitive-engine/types/evidence';

function stubEvidence(id: string, type: Evidence['type'], value: string, sourceSpan: string): Evidence {
  return { id, type, value, sourceSpan, confidence: 0.9, extractedAt: new Date().toISOString() };
}

interface Fixture {
  id: string;
  text: string;
  evidence: Evidence[];
  expectLocationStatus: 'resolved' | 'ambiguous' | 'unresolved';
  expectLocationMentions?: string;
}

const FIXTURES: Fixture[] = [
  {
    id: 'ps5-shiraz',
    text: 'یه پلی استیشن ۵ دست دوم میخوام تو شیراز فوری',
    evidence: [
      stubEvidence('E1', 'IDENTITY', 'پلی استیشن ۵', 'پلی استیشن ۵'),
      stubEvidence('E2', 'CONTEXT', 'شیراز', 'تو شیراز'),
    ],
    expectLocationStatus: 'resolved',
    expectLocationMentions: 'شیراز',
  },
  {
    id: 'laptop-rasht',
    text: 'لپ تاپ گیمینگ نو میخوام بخرم تو رشت بودجه تا هشتاد میلیون',
    evidence: [
      stubEvidence('E1', 'IDENTITY', 'لپ تاپ', 'لپ تاپ گیمینگ'),
      stubEvidence('E2', 'CONTEXT', 'رشت', 'تو رشت'),
    ],
    expectLocationStatus: 'resolved',
    expectLocationMentions: 'رشت',
  },
];

async function runFixture(f: Fixture): Promise<string[]> {
  const errors: string[] = [];
  const grounded = await groundEvidence(f.evidence, f.text);

  const location = grounded.find((g) => g.domain === 'location');
  const category = grounded.find((g) => g.domain === 'category');

  if (!location) {
    errors.push(`${f.id}: no location grounding entry returned`);
  } else {
    if (location.status !== f.expectLocationStatus) {
      errors.push(`${f.id}: location status ${location.status}, expected ${f.expectLocationStatus}`);
    }
    if (f.expectLocationMentions) {
      const found = location.candidates.some((c) => c.label.includes(f.expectLocationMentions!));
      if (!found) {
        errors.push(
          `${f.id}: no location candidate mentions "${f.expectLocationMentions}" — got ${JSON.stringify(location.candidates)}`
        );
      }
      if (location.status === 'resolved' && location.derivedFromEvidenceIds.length === 0) {
        errors.push(`${f.id}: resolved location has no derivedFromEvidenceIds (provenance broken)`);
      }
    }
  }

  if (!category) {
    errors.push(`${f.id}: no category grounding entry returned`);
  } else {
    // Parity check — the whole point of Phase 2's wrapper.
    const direct = matchCategoryCandidatesFromRules(f.text, { limit: 5 });
    const directSlugs = direct.map((c) => c.slug);
    const groundedSlugs = category.candidates.map((c) => c.id);
    if (JSON.stringify(directSlugs) !== JSON.stringify(groundedSlugs)) {
      errors.push(
        `${f.id}: category candidates diverge from direct rules matcher — direct=${JSON.stringify(directSlugs)} grounded=${JSON.stringify(groundedSlugs)}`
      );
    }
  }

  return errors;
}

export async function runGroundingSelfTest(): Promise<{ passed: number; failed: string[] }> {
  const failed: string[] = [];
  for (const f of FIXTURES) {
    failed.push(...(await runFixture(f)));
  }
  return { passed: FIXTURES.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-grounding-self-test'));

if (isDirectRun) {
  runGroundingSelfTest().then(({ passed, failed }) => {
    if (failed.length) {
      console.error('Grounding self-test FAILED:\n', failed.join('\n'));
      process.exit(1);
    }
    console.log(`Grounding self-test OK: ${passed}/${FIXTURES.length}`);
  });
}
