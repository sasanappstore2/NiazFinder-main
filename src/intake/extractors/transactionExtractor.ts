import type { TransactionType } from '@/intake/types';
import {
  hasExplicitRahnAndRentAmounts,
  isSeekerRahnEjareDeal,
  isTenantSeekerRahnEjare,
  textHasRahnSignal,
  textHasRentSignal,
} from '@/lib/need-intake/deal-type-helpers';

interface TransactionHit {
  type: TransactionType;
  confidence: number;
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
  if (hasExplicitRahnAndRentAmounts(normalizedText) && textHasRahnSignal(normalizedText) && textHasRentSignal(normalizedText)) {
    return { type: 'DEPOSIT_AND_RENT', confidence: 0.92 };
  }
  if (
    textHasRahnSignal(normalizedText) &&
    textHasRentSignal(normalizedText) &&
    /رهن\s*و\s*اجاره/u.test(normalizedText)
  ) {
    return { type: 'DEPOSIT_AND_RENT', confidence: 0.91 };
  }

  for (const rule of RULES) {
    if (rule.type === 'DAILY_RENT' || rule.type === 'HOURLY_RENT') continue;
    for (const re of rule.patterns) {
      if (re.test(normalizedText)) {
        return { type: rule.type, confidence: rule.confidence };
      }
    }
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
