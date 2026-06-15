import { parseServiceRequestDynamicAnswers } from '@/lib/need-intake/map-service-request-to-draft';
import { legacyDealTypeFromTransactionType } from '@/lib/need-intake/resolve-transaction-type';

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Extract deal/budget meta from stored dynamicAnswers JSON. */
export function extractNeedBudgetMetaFromDynamicAnswers(raw: string | Record<string, unknown> | null | undefined) {
  const dynamic =
    typeof raw === 'string'
      ? parseServiceRequestDynamicAnswers(raw)
      : raw && typeof raw === 'object'
        ? raw
        : {};

  const dealType =
    typeof dynamic.dealType === 'string'
      ? dynamic.dealType
      : legacyDealTypeFromTransactionType(
          typeof dynamic.transactionType === 'string' ? dynamic.transactionType : undefined
        );

  return {
    dealType,
    rahnAmount: coerceNumber(dynamic.rahnAmount),
    monthlyRent: coerceNumber(dynamic.monthlyRent),
    deposit: coerceNumber(dynamic.deposit),
    nightlyRent: coerceNumber(dynamic.nightlyRent),
    dynamicAnswers: dynamic,
  };
}
