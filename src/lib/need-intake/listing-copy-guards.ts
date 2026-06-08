import { aiTitleConflictsDeterministicDeal } from '@/lib/need-intake/listing-title-sanitize';

const LEADING_DEAL_RE =
  /^(اجاره(?:\s+روزانه)?|رهن(?:\s+و\s+اجاره)?|رهن\s+کامل|خرید|فروش|جستجوی\s+ملک)\s+/u;

export function extractLeadingDealVerb(title: string): string | null {
  const m = title.trim().match(LEADING_DEAL_RE);
  return m?.[1]?.replace(/\s+/g, ' ') ?? null;
}

/** Client + server: keep deterministic deal verb when streamed AI flips it. */
export function pickListingTitleWithDealGuard(
  baselineTitle: string,
  candidateTitle: string,
  sourceText?: string
): string {
  if (!candidateTitle.trim()) return baselineTitle;
  if (aiTitleConflictsDeterministicDeal(baselineTitle, candidateTitle, sourceText)) {
    return baselineTitle;
  }
  const baseDeal = extractLeadingDealVerb(baselineTitle);
  const nextDeal = extractLeadingDealVerb(candidateTitle);
  if (baseDeal && nextDeal && baseDeal !== nextDeal) {
    return baselineTitle;
  }
  return candidateTitle;
}

/** Reject AI descriptions that contradict text deal (e.g. فروش when user said رهن). */
export function aiDescriptionConflictsSource(
  description: string,
  sourceText: string,
  dealTypeFa?: string
): boolean {
  const src = sourceText.trim();
  const desc = description.trim();
  if (!src || !desc) return false;

  const textHasRent = /رهن|ودیعه|اجاره/u.test(src);
  const textHasSale = /(?:فروش|خرید)(?!\s*اداری)/u.test(src);
  const descHasSale = /^فروش/u.test(desc) || /\bفروش\b/u.test(desc.slice(0, 80));
  const descHasBuy = /^خرید/u.test(desc) || /\bخرید\b/u.test(desc.slice(0, 80));

  if (textHasRent && !textHasSale && (descHasSale || descHasBuy)) {
    return true;
  }

  if (dealTypeFa?.includes('رهن') && (descHasSale || descHasBuy)) {
    return true;
  }

  return false;
}
