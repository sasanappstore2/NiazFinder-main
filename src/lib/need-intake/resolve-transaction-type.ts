import type { TransactionType } from '@/intake/types';
import { normalizeCategoryPair } from '@/config/categories';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

const RENT_TRANSACTIONS = new Set<TransactionType>([
  'RENT',
  'FULL_DEPOSIT',
  'DEPOSIT_AND_RENT',
  'DAILY_RENT',
  'HOURLY_RENT',
]);

const SALE_TRANSACTIONS = new Set<TransactionType>(['BUY', 'SELL']);

export function isRentTransactionType(tx: TransactionType): boolean {
  return RENT_TRANSACTIONS.has(tx);
}

export function isSaleTransactionType(tx: TransactionType): boolean {
  return SALE_TRANSACTIONS.has(tx);
}

/** Legacy dealType chip from canonical transactionType. */
export function transactionTypeToLegacyDeal(tx: TransactionType): string {
  const map: Record<TransactionType, string> = {
    BUY: 'buy',
    SELL: 'sell',
    RENT: 'rent_monthly',
    FULL_DEPOSIT: 'rent_rahn_full',
    DEPOSIT_AND_RENT: 'rent_rahn_ejare',
    DAILY_RENT: 'rent_short_term',
    HOURLY_RENT: 'rent_short_term',
  };
  return map[tx];
}

export function legacyDealTypeFromTransactionType(
  tx: TransactionType | string | null | undefined
): string | undefined {
  if (!tx) return undefined;
  const upper = String(tx).toUpperCase();
  const canonical: Record<string, TransactionType> = {
    BUY: 'BUY',
    SELL: 'SELL',
    RENT: 'RENT',
    FULL_DEPOSIT: 'FULL_DEPOSIT',
    DEPOSIT_AND_RENT: 'DEPOSIT_AND_RENT',
    DAILY_RENT: 'DAILY_RENT',
    HOURLY_RENT: 'HOURLY_RENT',
  };
  if (canonical[upper]) {
    return transactionTypeToLegacyDeal(canonical[upper]);
  }
  const mapped = mapDealTypeToTransaction(String(tx).toLowerCase());
  return mapped ? transactionTypeToLegacyDeal(mapped) : undefined;
}

export function inferTransactionTypeFromSlug(leafSlug: string): TransactionType | null {
  const s = leafSlug.toLowerCase();
  if (s.includes('rent')) return 'RENT';
  if (s.includes('sale')) return 'BUY';
  return null;
}

/** Parse deal intent from free-form Persian source text (rules parser). */
export function transactionTypeFromSourceText(sourceText: string): TransactionType | null {
  if (!sourceText.trim()) return null;
  const parsed = parseIntentFromText(sourceText);
  return mapDealTypeToTransaction(parsed.entities?.dealType);
}

export interface ResolveTransactionTypeInput {
  sourceText: string;
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  /** User-selected deal chip (legacy values like rent_rahn_ejare). */
  userDealType?: string | null;
  /** Existing canonical value on draft.entities. */
  existingTransactionType?: TransactionType | null;
}

const FINE_GRAINED_RENT: TransactionType[] = ['DEPOSIT_AND_RENT', 'FULL_DEPOSIT', 'DAILY_RENT', 'HOURLY_RENT'];

function isFineGrainedRent(tx: TransactionType): boolean {
  return FINE_GRAINED_RENT.includes(tx);
}

/**
 * Single resolver: text rent/رهن beats category *-sale slug; fine-grained rent beats coarse RENT slug.
 */
export function resolveTransactionType(input: ResolveTransactionTypeInput): TransactionType | null {
  const fromUser = input.userDealType
    ? mapDealTypeToTransaction(String(input.userDealType))
    : null;
  if (fromUser) return fromUser;

  const fromText = transactionTypeFromSourceText(input.sourceText);
  const leaf = input.categorySlug
    ? (normalizeCategoryPair(input.categorySlug, input.subcategorySlug ?? undefined)
        .subcategorySlug ??
      normalizeCategoryPair(input.categorySlug, input.subcategorySlug ?? undefined).categorySlug)
    : null;
  const fromSlug = leaf ? inferTransactionTypeFromSlug(leaf) : null;

  if (fromText && fromSlug) {
    if (isRentTransactionType(fromText) && isSaleTransactionType(fromSlug)) {
      return fromText;
    }
    if (isSaleTransactionType(fromText) && isRentTransactionType(fromSlug)) {
      return fromText;
    }
    if (isFineGrainedRent(fromText) && fromSlug === 'RENT') {
      return fromText;
    }
    if (fromText === 'BUY' && fromSlug === 'RENT') {
      return fromText;
    }
  }

  if (fromSlug) return fromSlug;
  if (fromText) return fromText;
  return input.existingTransactionType ?? null;
}

/** Prefer text-parsed legacy deal over category-implied sale/buy when they conflict. */
export function resolveLegacyDealType(
  textDeal: string | undefined,
  transactionType: TransactionType | null | undefined
): string | undefined {
  const fromCategory = transactionType
    ? legacyDealTypeFromTransactionType(transactionType)
    : undefined;

  if (!textDeal) return fromCategory;

  const textTx = mapDealTypeToTransaction(textDeal);
  const categoryTx = transactionType ?? null;

  if (
    textTx &&
    categoryTx &&
    isRentTransactionType(textTx) &&
    isSaleTransactionType(categoryTx)
  ) {
    return textDeal;
  }

  return fromCategory ?? textDeal;
}
