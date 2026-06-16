import type { ParsedIntent } from '@/contracts/need-intake';
import type { IntakeFieldBag } from '@/intake/intelligence-engine/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';

const OFFER_PHRASES = [
  /\u0622\u0645\u0627\u062F\u0647\s*\u0627\u062C\u0627\u0631\u0647/u,
  /\u0628\u0631\u0627\u06CC\s*\u0641\u0631\u0648\u0634/u,
  /\u0641\u0631\u0648\u0634\u06CC/u,
  /\u0627\u062C\u0627\u0631\u0647\s*\u062F\u0627\u062F\u0647/u,
];
const SEEK_PHRASES = [
  /\u0645\u06CC\s*\u062E\u0648(?:\u0627\u0645|\u0627\u0647|\u0627\u0647\u0645)/u,
  /\u0645\u06CC\u062E\u0648(?:\u0627\u0645|\u0627\u0647|\u0627\u0647\u0645)/u,
  /\u062F\u0646\u0628\u0627\u0644/u,
  /\u0646\u06CC\u0627\u0632\s*\u062F\u0627\u0631/u,
  /\u0644\u0627\u0632\u0645\s*\u062F\u0627\u0631/u,
];

export function detectNeedAssessmentGaps(
  bag: IntakeFieldBag,
  parsed: ParsedIntent,
  sourceText: string
): IntakeParseGap[] {
  const gaps: IntakeParseGap[] = [];
  const title = parsed.title ?? '';
  const isSeeker = SEEK_PHRASES.some((re) => re.test(sourceText));
  const titleOffers = OFFER_PHRASES.some((re) => re.test(title));

  if (isSeeker && titleOffers) {
    gaps.push({
      id: 'semantic:title-offer-vs-seek',
      kind: 'contradictory',
      messageFa:
        '\u0639\u0646\u0648\u0627\u0646 \u0634\u0628\u06CC\u0647 \u0622\u06AF\u0647\u06CC \u0641\u0631\u0648\u0634\u0646\u062F\u0647 \u0627\u0633\u062A',
      fieldKey: 'title',
    });
  }

  const deal = String(bag.dealType?.value ?? bag.transactionType?.value ?? '');
  const titleSell = /\u0641\u0631\u0648\u0634|\u0645\u06CC\s*\u0641\u0631\u0648/u.test(title);
  const titleRent = /\u0631\u0647\u0646|\u0627\u062C\u0627\u0631\u0647/u.test(title);
  const dualOffer =
    /\u0627\u062C\u0627\u0631\u0647\s*[\/\u0648]\s*\u0641\u0631\u0648\u0634|\u0641\u0631\u0648\u0634\s*[\/\u0648]\s*\u0627\u062C\u0627\u0631\u0647/u.test(
      sourceText
    ) ||
    /\u0641\u0631\u0648\u0634[^\n]{0,24}\u0648\s*\u0627\u062C\u0627\u0631\u0647/u.test(sourceText);
  if (deal.includes('rent') && titleSell && !titleRent && !dualOffer) {
    gaps.push({
      id: 'semantic:deal-title-sell-vs-rent',
      kind: 'contradictory',
      messageFa:
        '\u0639\u0646\u0648\u0627\u0646 \u0628\u0627 \u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647 \u0647\u0645\u200C\u062E\u0648\u0627\u0646 \u0646\u06CC\u0633\u062A',
      fieldKey: 'title',
    });
  }

  return gaps;
}
