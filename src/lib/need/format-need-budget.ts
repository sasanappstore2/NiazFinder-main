import { formatBudgetRange, formatPrice } from '@/lib/constants';
import {
  DEAL_TYPE_PRODUCT,
  DEAL_TYPE_PROPERTY,
  DEAL_TYPE_VEHICLE,
} from '@/config/category-filters/options';
import { legacyDealTypeFromTransactionType } from '@/lib/need-intake/resolve-transaction-type';

const RENT_DEAL_TYPES = new Set([
  'rent_monthly',
  'rent_rahn_full',
  'rent_rahn_ejare',
  'rent_short_term',
  'rent',
]);

const DEAL_TYPE_LABELS = new Map<string, string>(
  [...DEAL_TYPE_PROPERTY, ...DEAL_TYPE_VEHICLE, ...DEAL_TYPE_PRODUCT].map((o) => [
    o.value,
    o.label,
  ])
);

const LABEL_NEGOTIABLE = '\u062A\u0648\u0627\u0641\u0642\u06CC';
const LABEL_RAHN = '\u0631\u0647\u0646';
const LABEL_EJARE = '\u0627\u062C\u0627\u0631\u0647';
const LABEL_DAILY_RENT = '\u0627\u062C\u0627\u0631\u0647 \u0631\u0648\u0632\u0627\u0646\u0647';
const LABEL_UP_TO = '\u062A\u0627';
const LABEL_FROM = '\u0627\u0632';
const LABEL_SEP = ' \u00B7 ';

export interface NeedBudgetDisplayInput {
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetType?: 'FIXED' | 'HOURLY' | 'NEGOTIABLE' | string;
  dealType?: string | null;
  rahnAmount?: number | null;
  deposit?: number | null;
  monthlyRent?: number | null;
  nightlyRent?: number | null;
  dynamicAnswers?: Record<string, unknown>;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function readDynamicField(
  dynamicAnswers: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  if (!dynamicAnswers) return undefined;
  return coerceNumber(dynamicAnswers[key]);
}

function readDynamicDealType(
  dynamicAnswers: Record<string, unknown> | undefined
): string | undefined {
  if (!dynamicAnswers) return undefined;
  const raw = dynamicAnswers.dealType;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const tx = dynamicAnswers.transactionType;
  if (typeof tx === 'string' && tx.trim()) {
    return legacyDealTypeFromTransactionType(tx);
  }
  return undefined;
}

function formatRahnEjare(rahn: number, rent: number): string {
  return `${LABEL_RAHN} ${formatPrice(rahn)}${LABEL_SEP}${LABEL_EJARE} ${formatPrice(rent)}`;
}

/** Normalize request / dynamicAnswers into budget display fields. */
export function normalizeNeedBudgetInput(
  input: NeedBudgetDisplayInput
): Required<Pick<NeedBudgetDisplayInput, 'budgetMin' | 'budgetMax'>> &
  NeedBudgetDisplayInput {
  const dyn = input.dynamicAnswers;
  const dealType = input.dealType ?? readDynamicDealType(dyn) ?? undefined;
  const rahnAmount =
    coerceNumber(input.rahnAmount) ??
    readDynamicField(dyn, 'rahnAmount') ??
    readDynamicField(dyn, 'deposit') ??
    coerceNumber(input.deposit);
  const monthlyRent =
    coerceNumber(input.monthlyRent) ?? readDynamicField(dyn, 'monthlyRent');
  const nightlyRent =
    coerceNumber(input.nightlyRent) ?? readDynamicField(dyn, 'nightlyRent');

  return {
    ...input,
    dealType,
    rahnAmount,
    deposit: coerceNumber(input.deposit) ?? readDynamicField(dyn, 'deposit'),
    monthlyRent,
    nightlyRent,
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
  };
}

export function isRentDealType(dealType: string | null | undefined): boolean {
  if (!dealType) return false;
  return RENT_DEAL_TYPES.has(dealType.trim().toLowerCase());
}

export function resolveNeedDealTypeLabel(dealType: string | null | undefined): string | undefined {
  if (!dealType) return undefined;
  return DEAL_TYPE_LABELS.get(dealType) ?? undefined;
}

/**
 * Human-readable budget label for browse cards, detail facts, and briefings.
 * Handles rent/deposit pairs, full deposit, monthly rent, and buy/sell ranges.
 */
export function formatNeedBudgetLabel(input: NeedBudgetDisplayInput): string {
  const normalized = normalizeNeedBudgetInput(input);
  const deal = normalized.dealType;
  const rahn = normalized.rahnAmount ?? normalized.deposit;
  const rent = normalized.monthlyRent;
  const nightly = normalized.nightlyRent;
  const min = normalized.budgetMin ?? undefined;
  const max = normalized.budgetMax ?? undefined;

  if (normalized.budgetType === 'NEGOTIABLE' && !min && !max && !rahn && !rent && !nightly) {
    return LABEL_NEGOTIABLE;
  }

  switch (deal) {
    case 'rent_rahn_ejare': {
      if (rahn && rent) return formatRahnEjare(rahn, rent);
      if (rahn) return `${LABEL_RAHN} ${LABEL_UP_TO} ${formatPrice(rahn)}`;
      if (rent) return `${LABEL_EJARE} ${LABEL_UP_TO} ${formatPrice(rent)}`;
      break;
    }
    case 'rent_rahn_full': {
      const amount = rahn ?? max ?? min;
      if (amount) return `${LABEL_RAHN} ${formatPrice(amount)}`;
      break;
    }
    case 'rent_monthly':
    case 'rent': {
      const amount = rent ?? max ?? min;
      if (amount) return `${LABEL_EJARE} ${formatPrice(amount)}`;
      break;
    }
    case 'rent_short_term': {
      const amount = nightly ?? max ?? min;
      if (amount) return `${LABEL_DAILY_RENT} ${formatPrice(amount)}`;
      break;
    }
    case 'buy':
    case 'sell':
    default:
      break;
  }

  // Published convention: budgetMin = deposit, budgetMax = monthly rent.
  if (min && max && min !== max && max < min) {
    return formatRahnEjare(min, max);
  }

  // Legacy duplicate min/max with rent fields in dynamicAnswers.
  if (min && max && min === max && (rahn || rent)) {
    if (rahn && rent && rahn !== rent) {
      return formatRahnEjare(rahn, rent);
    }
    if (rahn && !rent) return `${LABEL_RAHN} ${formatPrice(rahn)}`;
    if (rent && !rahn) return `${LABEL_EJARE} ${formatPrice(rent)}`;
  }

  if (min && max) return formatBudgetRange(min, max);
  if (min) return `${LABEL_FROM} ${formatPrice(min)}`;
  if (max) return `${LABEL_UP_TO} ${formatPrice(max)}`;
  if (rahn && rent) return formatRahnEjare(rahn, rent);
  if (rahn) return `${LABEL_RAHN} ${formatPrice(rahn)}`;
  if (rent) return `${LABEL_EJARE} ${formatPrice(rent)}`;
  if (nightly) return `${LABEL_DAILY_RENT} ${formatPrice(nightly)}`;
  return LABEL_NEGOTIABLE;
}

export function formatRequestBudget(
  request: NeedBudgetDisplayInput & {
    budgetMin?: number;
    budgetMax?: number;
    budgetType?: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  }
): string {
  return formatNeedBudgetLabel({
    budgetMin: request.budgetMin,
    budgetMax: request.budgetMax,
    budgetType: request.budgetType,
    dealType: request.dealType,
    rahnAmount: request.rahnAmount,
    deposit: request.deposit,
    monthlyRent: request.monthlyRent,
    nightlyRent: request.nightlyRent,
    dynamicAnswers: request.dynamicAnswers,
  });
}
