import type { NeedDraft } from '@/contracts/need-intake';
import {
  getV2FieldLabel,
  getV2RequiredFieldKeys,
  inferV2DealType,
} from '@/lib/intake-v2/v2-essential-fields';
import { isLocationConfirmed } from '@/lib/intake-v2/field-confirmation';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';

export interface V2MissingField {
  key: string;
  label: string;
  required: boolean;
}

export interface V2Readiness {
  readinessScore: number;
  readyToPreview: boolean;
  canSoftPreview: boolean;
  missingFields: V2MissingField[];
  confirmedCount: number;
  requiredCount: number;
  publishValid: boolean;
  publishErrors: string[];
}

const RENT_MONEY_KEYS = ['deposit', 'monthlyRent'] as const;

function isRentDeal(dealType: string): boolean {
  return (
    dealType === 'rent_monthly' ||
    dealType === 'rent_rahn_ejare' ||
    dealType === 'rent_rahn_full' ||
    dealType === 'rent_short_term'
  );
}

function isRentMoneySatisfied(dealType: string, confirmedFields: Set<string>): boolean {
  if (dealType === 'rent_rahn_ejare') {
    return confirmedFields.has('deposit') && confirmedFields.has('monthlyRent');
  }
  if (dealType === 'rent_rahn_full') {
    return confirmedFields.has('deposit') || confirmedFields.has('rahnAmount');
  }
  return confirmedFields.has('deposit') || confirmedFields.has('monthlyRent');
}

function isFieldSatisfied(
  key: string,
  draft: NeedDraft,
  confirmedFields: Set<string>,
  dealType: string
): boolean {
  if (key === 'location') return isLocationConfirmed(draft, confirmedFields);

  if (RENT_MONEY_KEYS.includes(key as (typeof RENT_MONEY_KEYS)[number])) {
    if (!isRentDeal(dealType)) return true;
    return isRentMoneySatisfied(dealType, confirmedFields);
  }

  if (key === 'rahnAmount') {
    if (dealType !== 'rent_rahn_full' && dealType !== 'rent_rahn_ejare') return true;
    return confirmedFields.has('rahnAmount') || confirmedFields.has('deposit');
  }

  return confirmedFields.has(key);
}

function countUserTurns(draft: NeedDraft): number {
  return (draft.turns ?? []).filter((t) => t.role === 'user').length;
}

function rentMoneyMissingLabel(dealType: string): string {
  if (dealType === 'rent_rahn_ejare') return 'ودیعه و اجاره ماهانه';
  return 'ودیعه یا اجاره ماهانه';
}

export function buildV2Readiness(
  draft: NeedDraft,
  confirmedFields: Set<string>
): V2Readiness {
  const { parsedIntent, answers } = draft;
  const dealType = inferV2DealType(
    parsedIntent.categorySlug,
    answers,
    parsedIntent.entities ?? {}
  );
  let requiredKeys = getV2RequiredFieldKeys(parsedIntent.categorySlug, dealType);

  const needsFloorConfirm =
    /shop-rent|office-rent/.test(parsedIntent.categorySlug) &&
    (answers.floorMin != null || /همکف|هم\s*کف/.test(parsedIntent.rawText ?? ''));
  if (!needsFloorConfirm) {
    requiredKeys = requiredKeys.filter((k) => k !== 'floorMin');
  }

  const missingFields: V2MissingField[] = [];
  let confirmedCount = 0;
  const countedRentMoney = { done: false };

  for (const key of requiredKeys) {
    if (RENT_MONEY_KEYS.includes(key as (typeof RENT_MONEY_KEYS)[number])) {
      if (countedRentMoney.done) continue;
      countedRentMoney.done = true;
      const rentOk = isRentMoneySatisfied(dealType, confirmedFields);
      if (rentOk) {
        confirmedCount += 1;
      } else if (dealType === 'rent_rahn_ejare') {
        if (!confirmedFields.has('deposit')) {
          missingFields.push({
            key: 'deposit',
            label: getV2FieldLabel('deposit'),
            required: true,
          });
        } else if (!confirmedFields.has('monthlyRent')) {
          missingFields.push({
            key: 'monthlyRent',
            label: getV2FieldLabel('monthlyRent'),
            required: true,
          });
        }
      } else {
        missingFields.push({
          key: 'deposit',
          label: rentMoneyMissingLabel(dealType),
          required: true,
        });
      }
      continue;
    }

    const satisfied = isFieldSatisfied(key, draft, confirmedFields, dealType);
    if (satisfied) {
      confirmedCount += 1;
    } else {
      missingFields.push({
        key,
        label: getV2FieldLabel(key),
        required: true,
      });
    }
  }

  const requiredCount = missingFields.length + confirmedCount;
  const readinessScore =
    requiredCount > 0 ? Math.min(0.99, confirmedCount / requiredCount) : 0;

  const userTurns = countUserTurns(draft);
  const hasMinimumEngagement = userTurns >= 1;
  const allRequiredConfirmed = missingFields.length === 0;

  const publishResult = validateNeedDraftForPublish(draft);
  const publishErrors = publishResult.errors.map((e) => e.message);

  const readyToPreview =
    hasMinimumEngagement && allRequiredConfirmed && publishResult.success;

  const canSoftPreview =
    hasMinimumEngagement &&
    readinessScore >= 0.55 &&
    confirmedCount >= 3 &&
    !readyToPreview;

  return {
    readinessScore,
    readyToPreview,
    canSoftPreview,
    missingFields,
    confirmedCount,
    requiredCount,
    publishValid: publishResult.success,
    publishErrors,
  };
}
