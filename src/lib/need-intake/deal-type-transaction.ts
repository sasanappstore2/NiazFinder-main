import type { TransactionType } from '@/intake/types';

/** Map legacy dealType chip / answers → canonical transactionType. */
export function mapDealTypeToTransaction(dealType: string | undefined): TransactionType | null {
  if (!dealType) return null;
  const v = dealType.trim().toLowerCase();
  if (v === 'buy' || v === 'purchase') return 'BUY';
  if (v === 'sell' || v === 'sale') return 'SELL';
  if (v === 'rent' || v === 'monthly_rent' || v === 'rent_monthly') return 'RENT';
  if (v === 'full_deposit' || v === 'mortgage' || v === 'rent_rahn_full') return 'FULL_DEPOSIT';
  if (v === 'deposit_and_rent' || v === 'rent_rahn_ejare') return 'DEPOSIT_AND_RENT';
  if (v === 'daily_rent' || v === 'nightly' || v === 'rent_short_term') return 'DAILY_RENT';
  if (v === 'hourly_rent') return 'HOURLY_RENT';
  return null;
}
