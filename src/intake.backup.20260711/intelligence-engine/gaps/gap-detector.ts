import type { IntakeFieldBag } from '@/intake/intelligence-engine/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import type { MissingFieldItem } from '@/intake/types';
import { buildParseGapsFromRules } from '@/lib/need-intake/build-parse-gaps-from-rules';
import type { ParsedIntent } from '@/contracts/need-intake';
import { detectNeedAssessmentGaps } from '@/intake/intelligence-engine/gaps/need-assessment-rules';

const RAHN_WORD = '\u0631\u0647\u0646';
const VADIEEH = '\u0648\u062F\u06CC\u0639\u0647';
const EJARE_WORD = '\u0627\u062C\u0627\u0631\u0647';

export function detectGaps(
  bag: IntakeFieldBag,
  parsed: ParsedIntent,
  missingFields: MissingFieldItem[],
  sourceText: string
): IntakeParseGap[] {
  const gaps = buildParseGapsFromRules(missingFields, parsed);

  if (!bag.transactionType?.value && !bag.dealType?.value) {
    gaps.push({
      id: 'missing:transactionType',
      kind: 'missing',
      messageFa:
        '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647 \u0631\u0627 \u0645\u0634\u062E\u0635 \u06A9\u0646\u06CC\u062F',
      fieldKey: 'transactionType',
    });
  }

  if (
    bag.neighborhood?.value &&
    (!bag.neighborhoodSlug?.value || (bag.neighborhoodSlug.confidence ?? 0) < 0.65)
  ) {
    gaps.push({
      id: 'uncertain:neighborhoodSlug',
      kind: 'uncertain',
      messageFa: '\u0645\u062D\u0644\u0647 \u062F\u0642\u06CC\u0642 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F',
      fieldKey: 'neighborhoodSlug',
    });
  }

  if (bag.rahnAmount?.value != null !== (bag.monthlyRent?.value != null)) {
    const hasRahnWord = new RegExp(`${RAHN_WORD}|${VADIEEH}`, 'u').test(sourceText);
    const hasRentWord = new RegExp(EJARE_WORD, 'u').test(sourceText);
    if (hasRahnWord && hasRentWord && !bag.rahnAmount?.value) {
      gaps.push({
        id: 'missing:rahnAmount',
        kind: 'missing',
        messageFa: '\u0645\u0628\u0644\u063A \u0631\u0647\u0646 \u0631\u0627 \u0645\u0634\u062E\u0635 \u06A9\u0646\u06CC\u062F',
        fieldKey: 'rahnAmount',
      });
    }
  }

  gaps.push(...detectNeedAssessmentGaps(bag, parsed, sourceText));

  const seen = new Set<string>();
  return gaps.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}
