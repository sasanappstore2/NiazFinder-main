/**
 * Post-fill validation for hybrid Intake Agent.
 * Rejects out-of-range numerics, unknown slugs, and deal/money incompatibilities.
 */

import { getCategoryBySlug } from '@/config/categories';
import type { FieldBag, FieldState } from '@/intake/intelligence-engine/types';
import type { IntakeAgentWarning } from '@/intake/agent/types';

const MONEY_MAX = 1e15;
const AREA_MIN = 5;
const AREA_MAX = 100_000;
const ROOMS_MAX = 30;
const FLOOR_MAX = 200;
const YEAR_AGE_MAX = 200;

const MONEY_KEYS = new Set([
  'budget',
  'budgetMin',
  'budgetMax',
  'rahnAmount',
  'monthlyRent',
  'deposit',
  'nightlyRent',
  'pricePerMeterMin',
  'pricePerMeterMax',
]);

export interface PostFillValidationResult {
  fields: FieldBag;
  warnings: IntakeAgentWarning[];
  rejectedKeys: string[];
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clearField(bag: FieldBag, key: string): void {
  if (!bag[key]) return;
  bag[key] = {
    ...bag[key]!,
    value: null,
    confidence: 0,
    source: 'rule',
  };
}

function isRentishDeal(tx: string): boolean {
  return /RENT|DEPOSIT|rahn|rent|اجاره|رهن/i.test(tx);
}

function isSaleDeal(tx: string): boolean {
  return /BUY|SELL|buy|sell|خرید|فروش/i.test(tx) && !isRentishDeal(tx);
}

function validateNumericField(
  key: string,
  state: FieldState,
  warnings: IntakeAgentWarning[],
  rejected: string[]
): boolean {
  const n = asNumber(state.value);
  if (n == null) return true;

  if (MONEY_KEYS.has(key)) {
    if (n < 0 || n >= MONEY_MAX) {
      warnings.push({
        code: 'money_out_of_range',
        messageFa: `مبلغ «${key}» خارج از بازه معتبر است`,
        fieldKey: key,
      });
      rejected.push(key);
      return false;
    }
    return true;
  }

  if (key === 'area' || key === 'areaMin' || key === 'areaMax') {
    if (n < AREA_MIN || n > AREA_MAX) {
      warnings.push({
        code: 'area_out_of_range',
        messageFa: 'متراژ خارج از بازه معتبر است',
        fieldKey: key,
      });
      rejected.push(key);
      return false;
    }
    return true;
  }

  if (key === 'rooms') {
    if (n < 0 || n > ROOMS_MAX) {
      warnings.push({
        code: 'rooms_out_of_range',
        messageFa: 'تعداد اتاق خارج از بازه معتبر است',
        fieldKey: key,
      });
      rejected.push(key);
      return false;
    }
    return true;
  }

  if (key === 'floorMin' || key === 'floorMax' || key === 'totalFloors' || key === 'floor') {
    if (n < -5 || n > FLOOR_MAX) {
      warnings.push({
        code: 'floor_out_of_range',
        messageFa: 'طبقه خارج از بازه معتبر است',
        fieldKey: key,
      });
      rejected.push(key);
      return false;
    }
    return true;
  }

  if (key === 'yearMin' || key === 'yearMax' || key === 'buildingAge') {
    if (n < 0 || n > YEAR_AGE_MAX) {
      warnings.push({
        code: 'building_age_out_of_range',
        messageFa: 'سن بنا خارج از بازه معتبر است',
        fieldKey: key,
      });
      rejected.push(key);
      return false;
    }
  }

  return true;
}

/**
 * Validate and soft-clear invalid values after rules/AI merge.
 */
export function validatePostFillFields(fields: FieldBag): PostFillValidationResult {
  const bag: FieldBag = { ...fields };
  const warnings: IntakeAgentWarning[] = [];
  const rejectedKeys: string[] = [];

  const leaf = String(bag.subcategorySlug?.value ?? bag.categorySlug?.value ?? '').trim();
  if (leaf) {
    const meta = getCategoryBySlug(leaf);
    if (!meta) {
      warnings.push({
        code: 'category_unknown',
        messageFa: 'دسته‌بندی استخراج‌شده در فهرست معتبر نیست',
        fieldKey: 'categorySlug',
      });
      rejectedKeys.push('categorySlug', 'subcategorySlug');
      clearField(bag, 'categorySlug');
      clearField(bag, 'subcategorySlug');
    }
  }

  for (const [key, state] of Object.entries(bag)) {
    if (!state || state.value == null || state.value === '') continue;
    if (!validateNumericField(key, state, warnings, rejectedKeys)) {
      clearField(bag, key);
    }
  }

  const tx = String(bag.transactionType?.value ?? bag.dealType?.value ?? '');
  const hasRahn = asNumber(bag.rahnAmount?.value) != null;
  const hasRent = asNumber(bag.monthlyRent?.value) != null;
  const hasDeposit = asNumber(bag.deposit?.value) != null;
  const hasBudget =
    asNumber(bag.budgetMax?.value) != null || asNumber(bag.budget?.value) != null;

  if (isSaleDeal(tx) && (hasRahn || hasRent) && !hasBudget) {
    warnings.push({
      code: 'deal_money_mismatch',
      messageFa: 'برای خرید/فروش، رهن/اجاره معمولاً معنا ندارد — مبلغ بودجه را بررسی کنید',
      fieldKey: 'transactionType',
    });
  }

  if (isRentishDeal(tx) && hasBudget && !hasRahn && !hasRent && !hasDeposit) {
    // Prefer mapping budget → rent/rahn context via warning only; do not invent values.
    warnings.push({
      code: 'rent_budget_unspecified',
      messageFa: 'برای اجاره/رهن مشخص کنید مبلغ مربوط به رهن است یا اجاره ماهانه',
      fieldKey: 'transactionType',
    });
  }

  const city = bag.city?.value;
  const citySlug = bag.citySlug?.value;
  if (city && !citySlug && (bag.city?.confidence ?? 0) >= 0.75) {
    warnings.push({
      code: 'city_not_canonical',
      messageFa: 'شهر به شناسه رسمی وصل نشده',
      fieldKey: 'city',
    });
    if (bag.city) {
      bag.city = {
        ...bag.city,
        confidence: Math.min(bag.city.confidence ?? 0.7, 0.65),
      };
    }
  }

  return { fields: bag, warnings, rejectedKeys };
}

/**
 * Calibrate field confidence from rules evidence + provider + validator verdict.
 */
export function calibrateFieldConfidence(
  state: FieldState,
  opts?: { rejected?: boolean; providerConfidence?: number }
): number {
  if (opts?.rejected) return 0;
  const base = state.confidence ?? 0;
  const provider = opts?.providerConfidence;
  if (provider == null) return Math.min(1, Math.max(0, base));
  // Evidence-aware blend: prefer agreement, penalize disagreement.
  const blended = base * 0.55 + provider * 0.45;
  const delta = Math.abs(base - provider);
  const penalty = delta > 0.35 ? 0.12 : 0;
  return Math.min(1, Math.max(0, blended - penalty));
}
