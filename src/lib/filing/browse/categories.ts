import {
  DEAL_TYPE_LABELS,
  FILING_DEAL_TYPES,
  FILING_PROPERTY_KINDS,
  PROPERTY_KIND_LABELS,
  resolveCategorySlug,
  type FilingDealType,
  type FilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';

export type FilingCategoryValue = 'all' | FilingDealType;
export type FilingKindValue = 'all' | FilingPropertyKind;

export const FILING_DEAL_FILTER_OPTIONS: Array<{ value: FilingCategoryValue; label: string }> = [
  { value: 'all', label: 'همه موارد' },
  ...FILING_DEAL_TYPES.map((value) => ({
    value,
    label: DEAL_TYPE_LABELS[value],
  })),
];

export const FILING_KIND_FILTER_OPTIONS: Array<{ value: FilingKindValue; label: string }> = [
  { value: 'all', label: 'همه موارد' },
  ...FILING_PROPERTY_KINDS.map((value) => ({
    value,
    label: PROPERTY_KIND_LABELS[value],
  })),
];

export function filingCategorySlug(
  dealType: FilingCategoryValue,
  propertyKind: FilingKindValue
): string | null {
  if (dealType === 'all' || propertyKind === 'all') return null;
  return resolveCategorySlug(dealType, propertyKind) ?? null;
}

export function filingDealLabel(dealType: string | null | undefined): string | null {
  if (!dealType) return null;
  return DEAL_TYPE_LABELS[dealType as FilingDealType] ?? dealType;
}

export function filingKindLabel(propertyKind: string | null | undefined): string | null {
  if (!propertyKind) return null;
  return PROPERTY_KIND_LABELS[propertyKind as FilingPropertyKind] ?? propertyKind;
}

export function filingBrowseTitle(
  dealType: FilingCategoryValue,
  propertyKind: FilingKindValue
): string {
  if (dealType === 'all' && propertyKind === 'all') return 'فایلینگ املاک';
  const deal = dealType === 'all' ? null : filingDealLabel(dealType);
  const kind = propertyKind === 'all' ? null : filingKindLabel(propertyKind);
  return [deal, kind].filter(Boolean).join(' · ') || 'فایلینگ املاک';
}
