import type { RealEstateSubtype } from '@/lib/business/widget-registry';

export type RealEstateOnboardingFieldFlags = {
  serviceArea: boolean;
  specializations: boolean;
  designStyles: boolean;
  designStylesTitle?: string;
  designStylesPlaceholder?: string;
};

export type RealEstateOnboardingConfig = {
  stepLabel: string;
  stepShort: string;
  hint: string;
  fields: RealEstateOnboardingFieldFlags;
};

const SERVICE_AREA_ONLY: RealEstateOnboardingFieldFlags = {
  serviceArea: true,
  specializations: false,
  designStyles: false,
};

const AGENT_FIELDS: RealEstateOnboardingFieldFlags = {
  serviceArea: true,
  specializations: true,
  designStyles: false,
};

const ARCHITECT_FIELDS: RealEstateOnboardingFieldFlags = {
  serviceArea: true,
  specializations: false,
  designStyles: true,
  designStylesTitle: 'سبک‌های طراحی',
  designStylesPlaceholder: 'مثلاً مدرن، کلاسیک، مینیمال',
};

const INTERIOR_FIELDS: RealEstateOnboardingFieldFlags = {
  serviceArea: true,
  specializations: false,
  designStyles: true,
  designStylesTitle: 'نوع پروژه',
  designStylesPlaceholder: 'مثلاً بازسازی کامل، دکوراسیون اداری، نئوکلاسیک',
};

const CONFIG_BY_SUBTYPE: Record<RealEstateSubtype, RealEstateOnboardingConfig> = {
  'real-estate-agent': {
    stepLabel: 'محدوده و تخصص',
    stepShort: 'تخصص',
    hint: 'محدوده فعالیت و تخصص‌های املاک را مشخص کنید — همه اختیاری است. برای مشاور شخصی، نام خودتان در مرحله قبل کافی است.',
    fields: AGENT_FIELDS,
  },
  'real-estate-office': {
    stepLabel: 'محدوده و تخصص',
    stepShort: 'تخصص',
    hint: 'محدوده فعالیت دفتر و تخصص‌های املاک را مشخص کنید — همه اختیاری است.',
    fields: AGENT_FIELDS,
  },
  'property-manager': {
    stepLabel: 'محدوده و تخصص',
    stepShort: 'تخصص',
    hint: 'محدوده مدیریت املاک و تخصص‌ها را مشخص کنید — همه اختیاری است.',
    fields: AGENT_FIELDS,
  },
  architect: {
    stepLabel: 'سبک و محدوده',
    stepShort: 'سبک',
    hint: 'سبک‌های طراحی و محدوده پروژه را مشخص کنید — همه اختیاری است.',
    fields: ARCHITECT_FIELDS,
  },
  'interior-designer': {
    stepLabel: 'حوزه و پروژه',
    stepShort: 'پروژه',
    hint: 'حوزه فعالیت و نوع پروژه‌هایی که انجام می‌دهید را مشخص کنید — همه اختیاری است.',
    fields: INTERIOR_FIELDS,
  },
  'facility-maintenance': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'شهر یا مناطقی که خدمات نگهداری ساختمان ارائه می‌دهید — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
  'elevator-technician': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'محدوده ارائه خدمات آسانسور — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
  'land-surveyor': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'محدوده فعالیت نقشه‌برداری — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
  'official-appraiser': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'محدوده کارشناسی و قیمت‌گذاری — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
  'gate-automation': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'محدوده نصب و تعمیر درب اتوماتیک — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
  'general-contractor': {
    stepLabel: 'محدوده خدمات',
    stepShort: 'محدوده',
    hint: 'محدوده اجرای پروژه‌های ساختمانی — اختیاری است.',
    fields: SERVICE_AREA_ONLY,
  },
};

const DEFAULT_CONFIG: RealEstateOnboardingConfig = {
  stepLabel: 'جزئیات املاک',
  stepShort: 'جزئیات',
  hint: 'محدوده خدمات را مشخص کنید — همه فیلدها اختیاری‌اند.',
  fields: SERVICE_AREA_ONLY,
};

export function getRealEstateOnboardingConfig(
  subtype: RealEstateSubtype | null | undefined
): RealEstateOnboardingConfig {
  if (!subtype) return DEFAULT_CONFIG;
  return CONFIG_BY_SUBTYPE[subtype] ?? DEFAULT_CONFIG;
}
