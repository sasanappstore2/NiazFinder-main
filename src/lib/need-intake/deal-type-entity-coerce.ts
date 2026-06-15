/** Normalize MLX / rules dealType entity strings to canonical wizard keys. */
export function normalizeDealTypeEntity(raw: string): string | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'rent_rahn_full' || v === 'rahn_full' || v === 'full_rahn') return 'rent_rahn_full';
  if (
    v === 'rent_rahn_ejare' ||
    v === 'rahn_ejare' ||
    v === 'deposit_and_rent' ||
    v === 'rahn_and_rent'
  ) {
    return 'rent_rahn_ejare';
  }
  if (v === 'rent_monthly' || v === 'monthly_rent') return 'rent_monthly';
  if (v === 'rent_short_term' || v === 'short_term') return 'rent_short_term';
  if (v === 'buy' || v === 'purchase') return 'buy';
  if (v === 'sell' || v === 'sale') return 'sell';
  return raw.trim();
}
