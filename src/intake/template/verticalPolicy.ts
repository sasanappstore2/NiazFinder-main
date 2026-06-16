import type { ProposalMode } from '@/intake/template/proposalMode';
import type { TemplateSection } from '@/intake/template/types';

export interface VerticalPolicy {
  vertical: string;
  category: string;
  proposalMode: ProposalMode;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
  mandatorySectionKeys: readonly string[];
  sections: readonly TemplateSection[];
}

const REAL_ESTATE_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category', 'subcategory'],
  },
  {
    key: 'deal',
    label: 'نوع معامله',
    fields: ['transactionType'],
  },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: ['city', 'neighborhood', 'mapPin'],
  },
  {
    key: 'property-specs',
    label: 'مشخصات ملک',
    fields: ['area', 'rooms'],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const APARTMENT_RENT_POLICY: VerticalPolicy = {
  vertical: 'real-estate',
  category: 'apartment',
  proposalMode: 'real-estate',
  requiredFields: ['transactionType', 'neighborhood'],
  optionalFields: ['area', 'budget', 'rooms'],
  mandatorySectionKeys: ['category', 'location', 'deal'],
  sections: REAL_ESTATE_SECTIONS,
};

const APARTMENT_BUY_POLICY: VerticalPolicy = {
  ...APARTMENT_RENT_POLICY,
};

const SERVICES_SECTIONS: TemplateSection[] = [
  {
    key: 'service-type',
    label: 'نوع خدمت',
    layout: 'category',
    fields: ['category', 'description'],
  },
  { key: 'timing', label: 'زمان انجام', fields: ['urgency'] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: ['city', 'neighborhood'],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const VEHICLES_SECTIONS: TemplateSection[] = [
  { key: 'vehicle', label: 'خودرو', layout: 'category', fields: ['category'] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: ['city', 'neighborhood'],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const GENERAL_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category'],
  },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: ['city', 'neighborhood'],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

export const ROOT_VERTICAL_POLICIES: Record<string, VerticalPolicy> = {
  'real-estate': {
    vertical: 'real-estate',
    category: 'real-estate',
    proposalMode: 'real-estate',
    requiredFields: ['category', 'city', 'transactionType'],
    optionalFields: ['neighborhood', 'area', 'budget', 'rooms'],
    mandatorySectionKeys: ['category', 'location', 'deal'],
    sections: REAL_ESTATE_SECTIONS,
  },
  vehicles: {
    vertical: 'vehicles',
    category: 'car',
    proposalMode: 'vehicles',
    requiredFields: ['city'],
    optionalFields: ['budget', 'neighborhood'],
    mandatorySectionKeys: ['vehicle', 'location'],
    sections: VEHICLES_SECTIONS,
  },
  services: {
    vertical: 'services',
    category: 'plumbing',
    proposalMode: 'services',
    requiredFields: ['neighborhood', 'description'],
    optionalFields: ['urgency', 'budget'],
    mandatorySectionKeys: ['service-type', 'location'],
    sections: SERVICES_SECTIONS,
  },
};

export const DEFAULT_VERTICAL_POLICY: VerticalPolicy = {
  vertical: 'general',
  category: 'general',
  proposalMode: 'general',
  requiredFields: ['category', 'city'],
  optionalFields: ['budget', 'neighborhood'],
  mandatorySectionKeys: ['category', 'location'],
  sections: GENERAL_SECTIONS,
};

export function resolveVerticalPolicy(input: {
  rootSlug: string | null;
  category?: string | null;
  vertical?: string | null;
  categorySlug?: string | null;
  transactionType?: string | null;
}): VerticalPolicy {
  const { rootSlug, category, vertical, categorySlug, transactionType } = input;

  if (
    (vertical === 'real-estate' || rootSlug === 'real-estate') &&
    category === 'apartment'
  ) {
    if (transactionType === 'BUY' || transactionType === 'SELL') {
      return APARTMENT_BUY_POLICY;
    }
    return APARTMENT_RENT_POLICY;
  }

  if (vertical === 'real-estate' || rootSlug === 'real-estate') {
    const slug = categorySlug ?? '';
    if (
      slug.includes('apartment') ||
      slug.includes('villa') ||
      slug.includes('shop') ||
      slug.includes('office') ||
      slug.includes('land') ||
      slug.includes('industrial') ||
      slug.includes('real-estate')
    ) {
      return ROOT_VERTICAL_POLICIES['real-estate']!;
    }
  }

  if (category?.includes('plumb') || vertical === 'services' || rootSlug === 'services') {
    return ROOT_VERTICAL_POLICIES.services!;
  }

  if (category?.includes('car') || vertical === 'vehicles' || rootSlug === 'vehicles') {
    return ROOT_VERTICAL_POLICIES.vehicles!;
  }

  if (rootSlug && ROOT_VERTICAL_POLICIES[rootSlug]) {
    return ROOT_VERTICAL_POLICIES[rootSlug]!;
  }

  return DEFAULT_VERTICAL_POLICY;
}
