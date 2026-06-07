import type { FieldOption, NeedDraft } from '@/contracts/need-intake';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/config/need-schemas/labels';
import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';
import { getNeighborhoodCatalogForCity } from '@/lib/need-intake/neighborhood-catalog.server';
import { isRealEstateIntent } from '@/lib/intake-v2/real-estate-guard';
import {
  getPlaybookChips,
  isFieldSkippable,
} from '@/lib/intake-v2/v2-category-playbooks';
import { V2_SKIP_CHIP } from '@/lib/intake-v2/v2-chip-presets';
import type { V2TurnPlan } from '@/lib/intake-v2/v2-question-driver';
import { hasRealEstateIntakeStarted } from '@/lib/intake-v2/v2-question-driver';

export const V2_STARTER_CHIPS: FieldOption[] = [
  { value: 'می‌خواهم ملک اجاره کنم', label: 'اجاره ملک' },
  { value: 'می‌خواهم ملک بخرم', label: 'خرید ملک' },
  { value: 'می‌خواهم ملک بفروشم', label: 'فروش ملک' },
  { value: 'رهن کامل ملک', label: 'رهن کامل' },
];

export function dealTypeChips(): FieldOption[] {
  return Object.entries(PROPERTY_DEAL_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

export function propertyKindChips(): FieldOption[] {
  return Object.entries(PROPERTY_KIND_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

const POPULAR_CITY_IDS = ['mashhad', 'tehran-city', 'isfahan', 'shiraz', 'karaj'];

function locationChipsForDraft(draft: NeedDraft): FieldOption[] {
  const candidates = draft.parsedIntent.neighborhoodCandidates;
  if (candidates?.length) {
    return candidates.slice(0, 8).map((c) => ({
      value: `__hood__:${c.slug}`,
      label: c.label.includes('—') ? c.label : c.label,
    }));
  }

  const city = draft.parsedIntent.city;
  if (city) {
    const catalog = getNeighborhoodCatalogForCity(city).slice(0, 8);
    if (catalog.length) {
      return catalog.map((n) => ({
        value: `__hood__:${n.slug}`,
        label: n.name,
      }));
    }
  }

  return POPULAR_CITY_IDS.map((id) => {
    const meta = ALL_LOCATION_CITIES.find((c) => c.id === id);
    return {
      value: meta?.name ?? id,
      label: meta?.name ?? id,
    };
  }).slice(0, 6);
}

/** Property chips aligned with turnPlan.activeFieldKey. */
export function resolveV2Chips(
  draft: NeedDraft,
  turnPlan: V2TurnPlan
): FieldOption[] {
  if (turnPlan.readyToPreview) {
    return [{ value: 'preview', label: 'ساخت پیش‌نمایش آگهی' }];
  }

  if (!isRealEstateIntent(draft.parsedIntent) && !hasRealEstateIntakeStarted(draft)) {
    return V2_STARTER_CHIPS;
  }

  if (turnPlan.disambiguation?.options.length) {
    return turnPlan.disambiguation.options;
  }

  const fieldKey = turnPlan.activeFieldKey;
  if (!fieldKey) {
    if (turnPlan.canSoftPreview) {
      return [{ value: 'preview', label: 'پیش‌نمایش با اطلاعات فعلی' }];
    }
    return hasRealEstateIntakeStarted(draft) ? [] : V2_STARTER_CHIPS;
  }

  const chips: FieldOption[] = [];

  if (fieldKey === 'location') {
    const cityCandidates = draft.parsedIntent.cityCandidates;
    if (cityCandidates?.length) {
      chips.push(
        ...cityCandidates.map((c) => ({
          value: `__city__:${c.cityId}`,
          label: c.label,
        }))
      );
    } else {
      chips.push(...locationChipsForDraft(draft));
    }
  } else {
    const presets = getPlaybookChips(draft, fieldKey);
    if (presets?.length) chips.push(...presets);
  }

  if (
    fieldKey !== 'dealType' &&
    fieldKey !== 'location' &&
    isFieldSkippable(draft.parsedIntent.categorySlug, fieldKey)
  ) {
    chips.push(V2_SKIP_CHIP);
  }

  if (chips.length === 0 && turnPlan.canSoftPreview) {
    chips.push({ value: 'preview', label: 'پیش‌نمایش با اطلاعات فعلی' });
  }

  return chips;
}
