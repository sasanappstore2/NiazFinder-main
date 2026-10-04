import type { TransactionType } from '@/intake/types';
import {
  hasExplicitRahnAndRentAmounts,
  isSeekerRahnEjareDeal,
  isTenantSeekerRahnEjare,
  textHasRahnSignal,
  textHasRentSignal,
} from '@/lib/need-intake/deal-type-helpers';
import {
  findKeywordIndicesWithFuzzyRepair,
  hasMoneyMentionNear,
  moneyMentionsInText,
} from '@/lib/need-intake/parse-persian-amount';

interface TransactionHit {
  type: TransactionType;
  confidence: number;
}

const RAHN_KW = 'رهن';
const VADIYEH_KW = 'ودیعه';
const KAMEL_KW = 'کامل';
const KHRID_KW = 'خرید';
const FAGHAT_KW = 'فقط';

/** Context that makes a fuzzy «خرید» typo trustworthy (property or price nearby). */
const PROPERTY_OR_PRICE_CONTEXT =
  /آپارتمان|خانه|خونه|ویلا|مغازه|دفتر|زمین|سوئیت|ملک|باغ|بالای|زیر|میلیون|میلیارد|تومان|اجاره/u;

/**
 * Single-typo repair for the full-deposit phrase («رهن کامل» / «فقط رهن»).
 * Fires only when no exact spelling survives: one رهن-family token (exact or
 * unique fuzzy) directly adjacent to a perfect-or-typo'd «کامل» («رهن کام»,
 * «رهن کال», «رنه کامل»), or to «فقط», and anchored by a money mention nearby.
 * Negations («رهن کامل نیست») stay excluded.
 */
function detectFuzzyFullDeposit(text: string): boolean {
  if (/رهن\s*کامل|فقط\s*رهن/u.test(text)) return false; // exact RULES path owns these
  if (/رهن\s*کامل\s*نیست/u.test(text)) return false;
  const rahn = findKeywordIndicesWithFuzzyRepair(text, RAHN_KW);
  if (rahn.indices.length === 0) return false;
  const mentions = moneyMentionsInText(text);
  if (mentions.length === 0) return false;

  const maxPairGap = RAHN_KW.length + KAMEL_KW.length + 2;
  const kamel = findKeywordIndicesWithFuzzyRepair(text, KAMEL_KW);
  for (const ri of rahn.indices) {
    const rEnd = ri + RAHN_KW.length;
    for (const ki of kamel.indices) {
      const start = Math.min(ri, ki);
      const end = Math.max(rEnd, ki + KAMEL_KW.length);
      if (end - start <= maxPairGap && hasMoneyMentionNear(mentions, start, end)) {
        return true;
      }
    }
  }
  for (const m of text.matchAll(/(?<![\u0600-\u06FF])فقط(?![\u0600-\u06FF])/gu)) {
    const fi = m.index ?? -1;
    if (fi < 0) continue;
    const fEnd = fi + FAGHAT_KW.length;
    for (const ri of rahn.indices) {
      const start = Math.min(fi, ri);
      const end = Math.max(fEnd, ri + RAHN_KW.length);
      if (end - start <= maxPairGap && hasMoneyMentionNear(mentions, start, end)) {
        return true;
      }
    }
  }
  return false;
}

const RULES: Array<{ type: TransactionType; patterns: RegExp[]; confidence: number }> = [
  {
    type: 'FULL_DEPOSIT',
    patterns: [/رهن\s*کامل/u, /فقط\s*رهن/u],
    confidence: 0.95,
  },
  {
    type: 'DEPOSIT_AND_RENT',
    patterns: [/رهن\s*و\s*اجاره/u, /ودیعه\s*و\s*اجاره/u],
    confidence: 0.9,
  },
  {
    type: 'DAILY_RENT',
    patterns: [
      /اجاره\s*روزانه/u,
      /اجاره\s*کوتاه[\s‌]*مدت/u,
      /کوتاه[\s‌]*مدت/u,
      /هر\s*شب/u,
      /تومان\s*شب/u,
      /سوئیت\s*روزانه/u,
      /اجاره\s*شبانه(?!\u200c?روزی)/u,
    ],
    confidence: 0.92,
  },
  {
    type: 'HOURLY_RENT',
    patterns: [/اجاره\s*ساعتی/u, /ساعتی/u],
    confidence: 0.9,
  },
  {
    type: 'RENT',
    // Avoid «رنت» inside «اینترنت» (#617).
    patterns: [/اجاره\s*ماهانه/u, /اجاره/u, /(?<![\u0600-\u06FFa-zA-Z])رنت(?![\u0600-\u06FFa-zA-Z])/u, /مستاجر/u],
    confidence: 0.85,
  },
  {
    type: 'BUY',
    patterns: [/خرید/u, /می\s*خرم/u, /میخرم/u, /بخرم/u],
    confidence: 0.88,
  },
  {
    type: 'SELL',
    // Avoid «میوه‌فروشی» / «کتاب‌فروشی» shop nouns (#592).
    patterns: [/فروش(?!ی)/u, /می\s*فروشم/u, /میفروشم/u],
    confidence: 0.88,
  },
];

/**
 * Detect transaction intent. Does NOT infer BUY from vague «میخوام» alone.
 */
export function extractTransactionType(normalizedText: string): TransactionHit | null {
  // Prefer short-term before rahn+ejare so «کد رهگیری» does not win over کوتاه‌مدت/هر شب.
  for (const rule of RULES) {
    if (rule.type !== 'DAILY_RENT' && rule.type !== 'HOURLY_RENT') continue;
    for (const re of rule.patterns) {
      if (re.test(normalizedText)) {
        return { type: rule.type, confidence: rule.confidence };
      }
    }
  }

  if (isSeekerRahnEjareDeal(normalizedText)) {
    return { type: 'DEPOSIT_AND_RENT', confidence: 0.93 };
  }
  // Deposit keyword family = exact رهن/ودیعه or a unique single-edit repair of
  // either. textHasRahnSignal stays as the shared signal, but this module also
  // checks ودیعه itself: the shared helper's VADIYEH constant is misspelled and
  // never matches real «ودیعه» text, and 3-letter رهن typos are intentionally
  // left uncorrected by the global fuzzy corrector.
  const rahnSignal = textHasRahnSignal(normalizedText);
  const rahnKw = findKeywordIndicesWithFuzzyRepair(normalizedText, RAHN_KW);
  const vadiyehKw = findKeywordIndicesWithFuzzyRepair(normalizedText, VADIYEH_KW);
  const depositSignal =
    rahnSignal || rahnKw.indices.length > 0 || vadiyehKw.indices.length > 0;
  const depositRepaired = !rahnSignal && (rahnKw.fuzzy || vadiyehKw.fuzzy);
  if (
    depositSignal &&
    textHasRentSignal(normalizedText) &&
    hasExplicitRahnAndRentAmounts(normalizedText)
  ) {
    return {
      type: 'DEPOSIT_AND_RENT',
      confidence: depositRepaired ? 0.88 : 0.92,
    };
  }
  if (
    rahnSignal &&
    textHasRentSignal(normalizedText) &&
    /رهن\s*و\s*اجاره/u.test(normalizedText)
  ) {
    return { type: 'DEPOSIT_AND_RENT', confidence: 0.91 };
  }
  // Single-typo repair: «رنه کامل ۶۵۰ میلیون» must not fall through to the
  // BUY inference that budget magnitude triggers downstream.
  if (detectFuzzyFullDeposit(normalizedText)) {
    return { type: 'FULL_DEPOSIT', confidence: 0.9 };
  }

  for (const rule of RULES) {
    if (rule.type === 'DAILY_RENT' || rule.type === 'HOURLY_RENT') continue;
    for (const re of rule.patterns) {
      if (re.test(normalizedText)) {
        return { type: rule.type, confidence: rule.confidence };
      }
    }
  }

  // Last resort: «خری/خید» — a unique single-edit typo of «خرید» (the global
  // corrector keeps such short tokens untouched), anchored by property/price
  // context so a stray lookalike word cannot manufacture a BUY intent.
  const khridHit = findKeywordIndicesWithFuzzyRepair(normalizedText, KHRID_KW);
  if (khridHit.fuzzy && PROPERTY_OR_PRICE_CONTEXT.test(normalizedText)) {
    return { type: 'BUY', confidence: 0.78 };
  }
  return null;
}

/** Property categories that require explicit transaction type. */
export function categoryNeedsTransactionType(categorySlug: string | null): boolean {
  if (!categorySlug) return false;
  return (
    categorySlug.includes('apartment') ||
    categorySlug.includes('villa') ||
    categorySlug.includes('land') ||
    categorySlug.includes('office') ||
    categorySlug.includes('shop') ||
    categorySlug.includes('residential') ||
    categorySlug.includes('commercial') ||
    categorySlug === 'real-estate'
  );
}
