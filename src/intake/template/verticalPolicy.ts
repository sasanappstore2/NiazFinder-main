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

const LOCATION_SECTION_FIELDS = ['city', 'neighborhood', 'mapPin'] as const;

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
    fields: ['transactionType', 'dealType'],
  },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  {
    key: 'property-specs',
    label: 'مشخصات ملک',
    fields: ['area', 'rooms', 'buildingAge', 'amenities'],
  },
  {
    key: 'timing',
    label: 'فوریت و زمان‌بندی',
    fields: ['when', 'moveInWhen'],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget', 'rahnAmount', 'monthlyRent', 'deposit'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const APARTMENT_RENT_POLICY: VerticalPolicy = {
  vertical: 'real-estate',
  category: 'apartment',
  proposalMode: 'real-estate',
  requiredFields: ['transactionType', 'neighborhood'],
  optionalFields: ['area', 'budget', 'rooms', 'buildingAge', 'amenities', 'parkingCount'],
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
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const VEHICLES_SECTIONS: TemplateSection[] = [
  { key: 'vehicle', label: 'خودرو', layout: 'category', fields: ['category'] },
  { key: 'deal', label: 'نوع معامله', fields: [] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'vehicle-specs', label: 'مشخصات خودرو', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const ELECTRONICS_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category'],
  },
  { key: 'deal', label: 'نوع معامله', fields: [] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'product-specs', label: 'مشخصات کالا', fields: [] },
  { key: 'tech-specs', label: 'مشخصات فنی', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const HOME_APPLIANCES_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category'],
  },
  { key: 'deal', label: 'نوع معامله', fields: [] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'product-specs', label: 'مشخصات کالا', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const PRODUCT_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category'],
  },
  { key: 'deal', label: 'نوع معامله', fields: [] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'product-specs', label: 'مشخصات کالا', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
  { key: 'budget', label: 'بودجه', fields: ['budget'] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const JOBS_SECTIONS: TemplateSection[] = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    layout: 'category',
    fields: ['category'],
  },
  { key: 'job-type', label: 'نوع آگهی', fields: [] },
  {
    key: 'location',
    label: 'مکان',
    layout: 'location',
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'job-details', label: 'جزئیات شغل', fields: [] },
  { key: 'salary', label: 'حقوق', fields: [] },
  { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] },
];

const SOCIAL_SECTIONS: TemplateSection[] = [
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
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'social-details', label: 'جزئیات', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
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
    fields: [...LOCATION_SECTION_FIELDS],
  },
  { key: 'deal', label: 'نوع معامله', fields: [] },
  { key: 'product-specs', label: 'مشخصات', fields: [] },
  { key: 'timing', label: 'فوریت و زمان‌بندی', fields: ['when'] },
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
    optionalFields: ['budget', 'neighborhood', 'brand', 'dealType'],
    mandatorySectionKeys: ['vehicle', 'location'],
    sections: VEHICLES_SECTIONS,
  },
  services: {
    vertical: 'services',
    category: 'plumbing',
    proposalMode: 'services',
    requiredFields: ['neighborhood', 'description'],
    optionalFields: ['urgency', 'budget', 'serviceType'],
    mandatorySectionKeys: ['service-type', 'location'],
    sections: SERVICES_SECTIONS,
  },
  electronics: {
    vertical: 'electronics',
    category: 'electronics',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['dealType', 'condition', 'brand', 'budget', 'storage'],
    mandatorySectionKeys: ['category', 'location'],
    sections: ELECTRONICS_SECTIONS,
  },
  'home-appliances': {
    vertical: 'home-appliances',
    category: 'home-appliances',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['dealType', 'condition', 'brand', 'budget'],
    mandatorySectionKeys: ['category', 'location'],
    sections: HOME_APPLIANCES_SECTIONS,
  },
  entertainment: {
    vertical: 'entertainment',
    category: 'entertainment',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['dealType', 'condition', 'brand', 'budget'],
    mandatorySectionKeys: ['category', 'location'],
    sections: PRODUCT_SECTIONS,
  },
  'personal-items': {
    vertical: 'personal-items',
    category: 'personal-items',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['dealType', 'condition', 'brand', 'budget'],
    mandatorySectionKeys: ['category', 'location'],
    sections: PRODUCT_SECTIONS,
  },
  jobs: {
    vertical: 'jobs',
    category: 'jobs',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['roleType', 'jobTitle', 'employmentType', 'salaryMin'],
    mandatorySectionKeys: ['category', 'location'],
    sections: JOBS_SECTIONS,
  },
  social: {
    vertical: 'social',
    category: 'social',
    proposalMode: 'general',
    requiredFields: ['category', 'city'],
    optionalFields: ['socialType'],
    mandatorySectionKeys: ['category', 'location'],
    sections: SOCIAL_SECTIONS,
  },
};

export const DEFAULT_VERTICAL_POLICY: VerticalPolicy = {
  vertical: 'general',
  category: 'general',
  proposalMode: 'general',
  requiredFields: ['category', 'city'],
  optionalFields: ['budget', 'neighborhood', 'dealType', 'condition'],
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
