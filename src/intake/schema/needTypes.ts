import type { IntakeEntities } from '@/intake/types';

export type ProposalMode = 'real-estate' | 'services' | 'vehicles' | 'general';

export interface NeedTypeVersion {
  needType: string;
  schemaVersion: number;
}

export interface NeedTypeDefinition {
  key: string;
  schemaVersion: number;
  vertical: string;
  category: string;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
  proposalMode: ProposalMode;
  sections: ReadonlyArray<{
    key: string;
    label: string;
    fields: readonly string[];
  }>;
}

export const NEED_TYPES: readonly NeedTypeDefinition[] = [
  {
    key: 'apartment-rent-seeking',
    schemaVersion: 1,
    vertical: 'real-estate',
    category: 'apartment',
    requiredFields: ['transactionType', 'neighborhood'],
    optionalFields: ['area', 'budget', 'rooms'],
    proposalMode: 'real-estate',
    sections: [
      { key: 'category', label: 'دسته‌بندی', fields: ['category', 'subcategory'] },
      { key: 'deal', label: 'نوع معامله', fields: ['transactionType'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'property-specs', label: 'مشخصات ملک', fields: ['area', 'rooms'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
  {
    key: 'apartment-buy-seeking',
    schemaVersion: 1,
    vertical: 'real-estate',
    category: 'apartment',
    requiredFields: ['transactionType', 'neighborhood'],
    optionalFields: ['area', 'budget', 'rooms'],
    proposalMode: 'real-estate',
    sections: [
      { key: 'category', label: 'دسته‌بندی', fields: ['category', 'subcategory'] },
      { key: 'deal', label: 'نوع معامله', fields: ['transactionType'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'property-specs', label: 'مشخصات ملک', fields: ['area', 'rooms'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
  {
    key: 'plumbing-service-seeking',
    schemaVersion: 1,
    vertical: 'services',
    category: 'plumbing',
    requiredFields: ['neighborhood', 'description'],
    optionalFields: ['urgency', 'budget'],
    proposalMode: 'services',
    sections: [
      { key: 'service-type', label: 'نوع خدمت', fields: ['category', 'description'] },
      { key: 'timing', label: 'زمان انجام', fields: ['urgency'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
  {
    key: 'car-seeking',
    schemaVersion: 1,
    vertical: 'vehicles',
    category: 'car',
    requiredFields: ['city'],
    optionalFields: ['budget', 'neighborhood'],
    proposalMode: 'vehicles',
    sections: [
      { key: 'vehicle', label: 'خودرو', fields: ['category'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
  {
    key: 'real-estate-seeking',
    schemaVersion: 1,
    vertical: 'real-estate',
    category: 'real-estate',
    requiredFields: ['category', 'city', 'transactionType'],
    optionalFields: ['neighborhood', 'area', 'budget', 'rooms'],
    proposalMode: 'real-estate',
    sections: [
      { key: 'category', label: 'دسته‌بندی', fields: ['category', 'subcategory'] },
      { key: 'deal', label: 'نوع معامله', fields: ['transactionType'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'property-specs', label: 'مشخصات ملک', fields: ['area', 'rooms'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
  {
    key: 'general-seeking',
    schemaVersion: 1,
    vertical: 'general',
    category: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['budget', 'neighborhood'],
    proposalMode: 'general',
    sections: [
      { key: 'category', label: 'دسته‌بندی', fields: ['category'] },
      { key: 'location', label: 'موقعیت', fields: ['city', 'neighborhood'] },
      { key: 'budget', label: 'بودجه', fields: ['budget'] },
    ],
  },
] as const;

export function getNeedTypeDefinition(
  needType: string,
  schemaVersion?: number
): NeedTypeDefinition | null {
  const match = NEED_TYPES.find(
    (t) =>
      t.key === needType &&
      (schemaVersion == null || t.schemaVersion === schemaVersion)
  );
  if (match) return match;
  if (schemaVersion != null) {
    return NEED_TYPES.find((t) => t.key === needType) ?? null;
  }
  return NEED_TYPES.find((t) => t.key === needType) ?? null;
}

export function resolveNeedType(entities: IntakeEntities): NeedTypeDefinition {
  if (entities.vertical === 'real-estate' && entities.category === 'apartment') {
    if (entities.transactionType === 'BUY' || entities.transactionType === 'SELL') {
      return NEED_TYPES[1]!;
    }
    return NEED_TYPES[0]!;
  }
  if (entities.vertical === 'real-estate' || entities.categorySlug?.includes('-')) {
    const slug = entities.categorySlug ?? '';
    if (
      slug.includes('apartment') ||
      slug.includes('villa') ||
      slug.includes('shop') ||
      slug.includes('office') ||
      slug.includes('land') ||
      slug.includes('industrial') ||
      slug.includes('real-estate')
    ) {
      return NEED_TYPES[4]!;
    }
  }
  if (entities.category?.includes('plumb') || entities.vertical === 'services') {
    return NEED_TYPES[2]!;
  }
  if (entities.category?.includes('car') || entities.vertical === 'vehicles') {
    return NEED_TYPES[3]!;
  }
  return NEED_TYPES[5]!;
}

