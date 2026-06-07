import type { FieldOption, NeedDraft } from '@/contracts/need-intake';
import type { V2MissingField, V2Readiness } from '@/lib/intake-v2/v2-readiness';
import { isLocationConfirmed } from '@/lib/intake-v2/field-confirmation';
import { inferV2DealType, getV2RequiredFieldKeys } from '@/lib/intake-v2/v2-essential-fields';

export interface V2Disambiguation {
  question: string;
  options: FieldOption[];
}

export interface V2TurnPlan {
  activeFieldKey: string | null;
  activeFieldLabel: string | null;
  disambiguation?: V2Disambiguation;
  missingFields: V2MissingField[];
  readyToPreview: boolean;
  canSoftPreview: boolean;
  readinessScore: number;
  confirmedCount: number;
  requiredCount: number;
}

function resolveRentMoneyField(
  draft: NeedDraft,
  confirmed: Set<string>
): 'deposit' | 'monthlyRent' | null {
  const dealType = inferV2DealType(
    draft.parsedIntent.categorySlug,
    draft.answers,
    draft.parsedIntent.entities ?? {}
  );
  if (dealType === 'rent_rahn_ejare') {
    if (!confirmed.has('deposit')) return 'deposit';
    if (!confirmed.has('monthlyRent')) return 'monthlyRent';
    return null;
  }
  if (!confirmed.has('deposit') && !confirmed.has('monthlyRent')) return 'deposit';
  return null;
}

function pickActiveFieldKey(
  draft: NeedDraft,
  confirmed: Set<string>,
  missing: V2MissingField[]
): string | null {
  if (missing.length === 0) return null;

  const missingKeys = new Set(missing.map((m) => m.key));

  if (missingKeys.has('location') && !confirmed.has('location')) {
    const blockers = ['dealType', 'propertyKind'].filter(
      (k) => missingKeys.has(k) && !confirmed.has(k)
    );
    if (blockers.length === 0) {
      return 'location';
    }
  }

  const slug = draft.parsedIntent.categorySlug;
  const dealType = inferV2DealType(
    slug,
    draft.answers,
    draft.parsedIntent.entities ?? {}
  );
  const order = getV2RequiredFieldKeys(slug, dealType);

  for (const key of order) {
    if (!missingKeys.has(key)) continue;
    if (key === 'deposit' && (missingKeys.has('deposit') || missingKeys.has('monthlyRent'))) {
      const rentField = resolveRentMoneyField(draft, confirmed);
      if (rentField) return rentField;
      continue;
    }
    return key;
  }

  return missing[0]?.key ?? null;
}

function countUserTurns(draft: NeedDraft): number {
  return (draft.turns ?? []).filter((t) => t.role === 'user').length;
}

/** Single source of truth for which field the assistant asks and chips target. */
export function buildV2TurnPlan(
  draft: NeedDraft,
  confirmedFields: Set<string>,
  readiness: V2Readiness
): V2TurnPlan {
  const base = {
    missingFields: readiness.missingFields,
    readyToPreview: readiness.readyToPreview,
    canSoftPreview: readiness.canSoftPreview,
    readinessScore: readiness.readinessScore,
    confirmedCount: readiness.confirmedCount,
    requiredCount: readiness.requiredCount,
  };

  if (readiness.readyToPreview) {
    return { ...base, activeFieldKey: null, activeFieldLabel: null };
  }

  const { parsedIntent } = draft;
  const intakeStarted =
    draft.vertical === 'real-estate' || countUserTurns(draft) >= 1;

  if (
    intakeStarted &&
    (parsedIntent.locationAmbiguous ||
      parsedIntent.locationResolutionStatus === 'city_ambiguous' ||
      parsedIntent.locationResolutionStatus === 'neighborhood_ambiguous') &&
    !isLocationConfirmed(draft, confirmedFields)
  ) {
    const cityCandidates = parsedIntent.cityCandidates ?? [];
    if (
      parsedIntent.locationResolutionStatus === 'city_ambiguous' &&
      cityCandidates.length >= 2
    ) {
      return {
        ...base,
        activeFieldKey: 'location',
        activeFieldLabel: 'شهر',
        disambiguation: {
          question: 'این محله در کدام شهر مدنظر است؟',
          options: cityCandidates.map((c) => ({
            value: `__city__:${c.cityId}`,
            label: c.label,
          })),
        },
      };
    }

    const candidates = parsedIntent.neighborhoodCandidates ?? [];
    if (candidates.length >= 2) {
      return {
        ...base,
        activeFieldKey: 'location',
        activeFieldLabel: 'محله',
        disambiguation: {
          question: 'کدام محله دقیق‌تر مدنظر است؟',
          options: candidates.map((c) => ({
            value: `__hood__:${c.slug}`,
            label: c.label.includes('—') ? c.label : c.label,
          })),
        },
      };
    }

    if (
      candidates.length >= 1 &&
      parsedIntent.locationResolutionStatus === 'city_ambiguous'
    ) {
      return {
        ...base,
        activeFieldKey: 'location',
        activeFieldLabel: 'شهر',
        disambiguation: {
          question: 'کدام شهر و محله مدنظر است؟',
          options: candidates.map((c) => ({
            value: `__hood__:${c.slug}`,
            label: c.label,
          })),
        },
      };
    }
  }

  const activeFieldKey = pickActiveFieldKey(
    draft,
    confirmedFields,
    readiness.missingFields
  );
  const activeFieldLabel = activeFieldKey
    ? (readiness.missingFields.find((m) => m.key === activeFieldKey)?.label ??
      readiness.missingFields[0]?.label ??
      null)
    : null;

  return {
    ...base,
    activeFieldKey,
    activeFieldLabel,
  };
}

export function hasRealEstateIntakeStarted(draft: NeedDraft): boolean {
  return (
    draft.vertical === 'real-estate' ||
    countUserTurns(draft) >= 1 ||
    Boolean(draft.parsedIntent.categorySlug && draft.parsedIntent.categorySlug !== 'general')
  );
}
