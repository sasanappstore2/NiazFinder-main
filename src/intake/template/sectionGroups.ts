/**
 * Maps intake filter fields to UI section keys per marketplace root.
 * Used by buildIntakeSections to populate optional «افزودن اطلاعات» pills.
 */

export const SKIP_INTAKE_SECTION_FIELDS = new Set([
  'city',
  'neighborhood',
  'location',
  'category',
  'subcategory',
  'serviceCategory',
  'details',
  'description',
  'mapPin',
]);

/** Default section key → Persian label. */
export const SECTION_DEFAULT_LABELS: Record<string, string> = {
  deal: 'نوع معامله',
  'property-specs': 'مشخصات ملک',
  'vehicle-specs': 'مشخصات خودرو',
  'product-specs': 'مشخصات کالا',
  'tech-specs': 'مشخصات فنی',
  'service-details': 'شرح خدمت',
  timing: 'زمان انجام',
  budget: 'بودجه',
  'job-type': 'نوع آگهی',
  'job-details': 'جزئیات شغل',
  salary: 'حقوق',
  'social-details': 'جزئیات',
  specs: 'فیلترهای پیشرفته',
};

/** Category-specific section label overrides (e.g. musical-instruments → مشخصات ساز). */
export const CATEGORY_SECTION_LABEL_OVERRIDES: Record<string, Record<string, string>> = {
  'musical-instruments': { 'product-specs': 'مشخصات ساز' },
  pets: { 'product-specs': 'مشخصات حیوان' },
  motorcycle: { 'vehicle-specs': 'مشخصات موتور' },
  'spare-parts': { 'product-specs': 'مشخصات قطعه' },
  boat: { 'vehicle-specs': 'مشخصات قایق' },
  plumbing: { 'service-details': 'شرح خدمت' },
  cleaning: { 'service-details': 'شرح خدمت' },
  moving: { 'service-details': 'شرح خدمت' },
  electrical: { 'service-details': 'شرح خدمت' },
  painting: { 'service-details': 'شرح خدمت' },
};

export interface RootSectionConfig {
  /** sectionKey → Persian label */
  sectionLabels: Record<string, string>;
  /** field key → section key */
  fieldToSection: Record<string, string>;
  /** Preferred order when inserting new sections (before specs). */
  sectionOrder: readonly string[];
}

const REAL_ESTATE_FIELDS: Record<string, string> = {
  dealType: 'deal',
  transactionType: 'deal',
  propertyKind: 'deal',
  area: 'property-specs',
  areaMin: 'property-specs',
  areaMax: 'property-specs',
  rooms: 'property-specs',
  amenities: 'property-specs',
  buildingAge: 'property-specs',
  deedType: 'property-specs',
  floorMin: 'property-specs',
  floorMax: 'property-specs',
  totalFloors: 'property-specs',
  unitCount: 'property-specs',
  yearMin: 'property-specs',
  yearMax: 'property-specs',
  familyCount: 'property-specs',
  guestCount: 'property-specs',
  nightlyRent: 'property-specs',
  plotWidth: 'property-specs',
  landUse: 'property-specs',
  delivery: 'property-specs',
  projectName: 'property-specs',
  parkingCount: 'property-specs',
  bathroomCount: 'property-specs',
  orientation: 'property-specs',
  facadeType: 'property-specs',
  heating: 'property-specs',
  cooling: 'property-specs',
  cabinetType: 'property-specs',
  posterKind: 'property-specs',
  moveInWhen: 'timing',
  shortTermAmenities: 'property-specs',
  budget: 'budget',
  budgetMin: 'budget',
  budgetMax: 'budget',
  deposit: 'budget',
  monthlyRent: 'budget',
  rahnAmount: 'budget',
  pricePerMeterMin: 'budget',
  pricePerMeterMax: 'budget',
  when: 'timing',
  urgency: 'timing',
};

const VEHICLE_FIELDS: Record<string, string> = {
  dealType: 'deal',
  vehicleKind: 'vehicle-specs',
  brand: 'vehicle-specs',
  condition: 'vehicle-specs',
  yearMin: 'vehicle-specs',
  yearMax: 'vehicle-specs',
  mileageMax: 'vehicle-specs',
  mileageMin: 'vehicle-specs',
  serviceType: 'service-details',
  budget: 'budget',
  budgetMin: 'budget',
  budgetMax: 'budget',
  when: 'timing',
  urgency: 'timing',
};

const PRODUCT_FIELDS: Record<string, string> = {
  dealType: 'deal',
  productName: 'product-specs',
  condition: 'product-specs',
  brand: 'product-specs',
  storage: 'tech-specs',
  ram: 'tech-specs',
  budget: 'budget',
  budgetMin: 'budget',
  budgetMax: 'budget',
  when: 'timing',
  urgency: 'timing',
};

const SERVICE_FIELDS: Record<string, string> = {
  serviceType: 'service-details',
  serviceKind: 'service-details',
  when: 'timing',
  urgency: 'timing',
  budget: 'budget',
  budgetMin: 'budget',
  budgetMax: 'budget',
};

const JOB_FIELDS: Record<string, string> = {
  roleType: 'job-type',
  jobTitle: 'job-details',
  employmentType: 'job-details',
  experience: 'job-details',
  salaryMin: 'salary',
  salaryMax: 'salary',
};

const SOCIAL_FIELDS: Record<string, string> = {
  socialType: 'social-details',
};

export const ROOT_SECTION_CONFIGS: Record<string, RootSectionConfig> = {
  'real-estate': {
    sectionLabels: {
      deal: 'نوع معامله',
      'property-specs': 'مشخصات ملک',
      timing: 'فوریت و زمان‌بندی',
      budget: 'بودجه',
    },
    fieldToSection: REAL_ESTATE_FIELDS,
    sectionOrder: ['deal', 'property-specs', 'timing', 'budget'],
  },
  vehicles: {
    sectionLabels: {
      deal: 'نوع معامله',
      'vehicle-specs': 'مشخصات خودرو',
      timing: 'فوریت و زمان‌بندی',
      budget: 'بودجه',
    },
    fieldToSection: VEHICLE_FIELDS,
    sectionOrder: ['deal', 'vehicle-specs', 'timing', 'budget'],
  },
  electronics: {
    sectionLabels: {
      deal: 'نوع معامله',
      'product-specs': 'مشخصات کالا',
      'tech-specs': 'مشخصات فنی',
      timing: 'فوریت و زمان‌بندی',
      budget: 'بودجه',
    },
    fieldToSection: PRODUCT_FIELDS,
    sectionOrder: ['deal', 'product-specs', 'tech-specs', 'timing', 'budget'],
  },
  'home-appliances': {
    sectionLabels: {
      deal: 'نوع معامله',
      'product-specs': 'مشخصات کالا',
      budget: 'بودجه',
    },
    fieldToSection: {
      dealType: 'deal',
      productName: 'product-specs',
      condition: 'product-specs',
      brand: 'product-specs',
      budget: 'budget',
    },
    sectionOrder: ['deal', 'product-specs', 'budget'],
  },
  entertainment: {
    sectionLabels: {
      deal: 'نوع معامله',
      'product-specs': 'مشخصات کالا',
      budget: 'بودجه',
    },
    fieldToSection: {
      dealType: 'deal',
      productName: 'product-specs',
      condition: 'product-specs',
      brand: 'product-specs',
      petType: 'product-specs',
      budget: 'budget',
    },
    sectionOrder: ['deal', 'product-specs', 'budget'],
  },
  'personal-items': {
    sectionLabels: {
      deal: 'نوع معامله',
      'product-specs': 'مشخصات کالا',
      budget: 'بودجه',
    },
    fieldToSection: {
      dealType: 'deal',
      productName: 'product-specs',
      condition: 'product-specs',
      brand: 'product-specs',
      budget: 'budget',
    },
    sectionOrder: ['deal', 'product-specs', 'budget'],
  },
  services: {
    sectionLabels: {
      'service-details': 'شرح خدمت',
      timing: 'زمان انجام',
      budget: 'بودجه',
    },
    fieldToSection: SERVICE_FIELDS,
    sectionOrder: ['service-details', 'timing', 'budget'],
  },
  jobs: {
    sectionLabels: {
      'job-type': 'نوع آگهی',
      'job-details': 'جزئیات شغل',
      salary: 'حقوق',
    },
    fieldToSection: JOB_FIELDS,
    sectionOrder: ['job-type', 'job-details', 'salary'],
  },
  social: {
    sectionLabels: {
      'social-details': 'جزئیات',
    },
    fieldToSection: SOCIAL_FIELDS,
    sectionOrder: ['social-details'],
  },
};

const GENERAL_CONFIG: RootSectionConfig = {
  sectionLabels: {
    deal: 'نوع معامله',
    'product-specs': 'مشخصات',
    budget: 'بودجه',
  },
  fieldToSection: {
    dealType: 'deal',
    productName: 'product-specs',
    condition: 'product-specs',
    brand: 'product-specs',
    budget: 'budget',
  },
  sectionOrder: ['deal', 'product-specs', 'budget'],
};

export function getRootSectionConfig(
  rootSlug: string,
  categorySlug?: string | null
): RootSectionConfig {
  const base = ROOT_SECTION_CONFIGS[rootSlug] ?? GENERAL_CONFIG;
  if (!categorySlug) return base;

  const overrides = CATEGORY_SECTION_LABEL_OVERRIDES[categorySlug];
  if (!overrides) return base;

  return {
    ...base,
    sectionLabels: { ...base.sectionLabels, ...overrides },
  };
}

export function resolveSectionKeyForField(
  fieldKey: string,
  rootSlug: string,
  categorySlug?: string | null
): string {
  const config = getRootSectionConfig(rootSlug, categorySlug);
  return config.fieldToSection[fieldKey] ?? 'specs';
}

export function resolveSectionLabel(
  sectionKey: string,
  rootSlug: string,
  categorySlug?: string | null
): string {
  const config = getRootSectionConfig(rootSlug, categorySlug);
  return (
    config.sectionLabels[sectionKey] ??
    SECTION_DEFAULT_LABELS[sectionKey] ??
    sectionKey
  );
}
