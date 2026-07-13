/** Canonical filing listing attributes — deal type × property kind field model. */

export const FILING_DEAL_TYPES = [
  'sell',
  'rent_rahn_ejare',
  'rent_rahn_full',
  'rent_short_term',
] as const;

export type FilingDealType = (typeof FILING_DEAL_TYPES)[number];

export const FILING_PROPERTY_KINDS = [
  'apartment',
  'villa',
  'land',
  'office',
  'shop',
  'commercial',
] as const;

export type FilingPropertyKind = (typeof FILING_PROPERTY_KINDS)[number];

export const EXTENDED_FILING_ATTRIBUTE_KEYS = [
  'postedAt',
  'totalFloors',
  'unitsCount',
  'buildingAge',
  'documentType',
  'cabinet',
  'flooring',
  'wallCover',
  'facade',
  'orientation',
  'heating',
  'cooling',
  'exchangeable',
  'hasParking',
  'hasStorage',
  'hasElevator',
  'hasSecurityDoor',
  'hasTerrace',
  'hasBuiltInWardrobe',
  'detailUrl',
  'image',
  'images',
] as const;

export type ExtendedFilingAttributeKey = (typeof EXTENDED_FILING_ATTRIBUTE_KEYS)[number];

export const CORE_FILING_FIELD_KEYS = [
  'title',
  'fileCode',
  'dealType',
  'propertyKind',
  'city',
  'neighborhood',
  'location',
  'deposit',
  'monthlyRent',
  'price',
  'area',
  'rooms',
  'floor',
  'pricePerMeter',
  'description',
] as const;

export const ALL_FILING_FIELD_KEYS = [...CORE_FILING_FIELD_KEYS, ...EXTENDED_FILING_ATTRIBUTE_KEYS] as const;

export type FilingFieldKey = (typeof ALL_FILING_FIELD_KEYS)[number];

export const DEAL_TYPE_LABELS: Record<FilingDealType, string> = {
  sell: 'فروش',
  rent_rahn_ejare: 'رهن و اجاره',
  rent_rahn_full: 'رهن کامل',
  rent_short_term: 'اجاره کوتاه‌مدت',
};

export const PROPERTY_KIND_LABELS: Record<FilingPropertyKind, string> = {
  apartment: 'آپارتمان',
  villa: 'ویلا',
  land: 'زمین',
  office: 'دفتر کار',
  shop: 'مغازه',
  commercial: 'تجاری',
};

/** Financial fields required per deal type (for validation). */
export const DEAL_REQUIRED_FINANCIAL: Record<FilingDealType, readonly string[]> = {
  sell: ['price'],
  rent_rahn_ejare: ['deposit', 'monthlyRent'],
  rent_rahn_full: ['deposit'],
  rent_short_term: ['monthlyRent'],
};

export const DEAL_FORBIDDEN_FINANCIAL: Record<FilingDealType, readonly string[]> = {
  sell: ['deposit', 'monthlyRent'],
  rent_rahn_ejare: ['price'],
  rent_rahn_full: ['price', 'monthlyRent'],
  rent_short_term: ['price', 'deposit'],
};

const KIND_BASE_SLUG: Record<FilingPropertyKind, string> = {
  apartment: 'apartment',
  villa: 'villa',
  land: 'land',
  office: 'office',
  shop: 'shop',
  commercial: 'commercial',
};

const DEAL_SLUG_SUFFIX: Record<FilingDealType, string> = {
  sell: 'sale',
  rent_rahn_ejare: 'rent-rahn-ejare',
  rent_rahn_full: 'rent-rahn-full',
  rent_short_term: 'rent-short-term',
};

export function resolveCategorySlug(
  dealType: string | null | undefined,
  propertyKind: string | null | undefined
): string | undefined {
  const kind = propertyKind as FilingPropertyKind | undefined;
  const deal = dealType as FilingDealType | undefined;
  if (!kind || !FILING_PROPERTY_KINDS.includes(kind)) return undefined;
  const base = KIND_BASE_SLUG[kind];
  if (!deal || !FILING_DEAL_TYPES.includes(deal)) return `${base}-sale`;
  return `${base}-${DEAL_SLUG_SUFFIX[deal]}`;
}

/** @deprecated use resolveCategorySlug(dealType, propertyKind) */
export function resolveCategorySlugFromKindOnly(
  propertyKind: FilingPropertyKind | null | undefined
): string | undefined {
  return resolveCategorySlug('sell', propertyKind);
}

export function isFilingPropertyKind(value: string | null | undefined): value is FilingPropertyKind {
  return Boolean(value && FILING_PROPERTY_KINDS.includes(value as FilingPropertyKind));
}

export function isFilingDealType(value: string | null | undefined): value is FilingDealType {
  return Boolean(value && FILING_DEAL_TYPES.includes(value as FilingDealType));
}
