import type { CategoryFilterSpec } from './types';
import {
  AMENITIES,
  CONDITION,
  DEAL_TYPE_PRODUCT,
  DEAL_TYPE_PROPERTY,
  DEAL_TYPE_VEHICLE,
  DELIVERY_PRE_SALE,
  EMPLOYMENT_TYPE,
  EXPERIENCE,
  PET_TYPE,
  PROPERTY_KIND,
  RAM_OPTIONS,
  ROLE_TYPE,
  ROOMS,
  SERVICE_WHEN,
  SOCIAL_TYPE,
  STORAGE_MOBILE,
  VEHICLE_KIND,
} from './options';

const G = { browse: true, intake: true } as const;

/** Global browse controls for needs marketplace (`/n/`). */
export const GLOBAL_NEED_BROWSE_SPEC: CategoryFilterSpec = [
  { key: '_price', label: 'قیمت', kind: 'range', globalKey: 'price', browse: true, intake: false, audience: 'need' },
  { key: '_hasPhoto', label: 'عکس‌دار', kind: 'toggle', globalKey: 'hasPhoto', browse: true, intake: false, audience: 'need' },
  { key: '_sort', label: 'مرتب‌سازی', kind: 'select', globalKey: 'sort', browse: true, intake: false, audience: 'need' },
];

/** Global browse controls for business marketplace (`/b/`). */
export const GLOBAL_BUSINESS_BROWSE_SPEC: CategoryFilterSpec = [
  { key: '_verified', label: 'تأییدشده', kind: 'toggle', globalKey: 'verified', browse: true, intake: false, audience: 'business' },
  { key: '_sort', label: 'مرتب‌سازی', kind: 'select', globalKey: 'sort', browse: true, intake: false, audience: 'business' },
];

/** @deprecated Use GLOBAL_NEED_BROWSE_SPEC */
export const GLOBAL_BROWSE_SPEC = GLOBAL_NEED_BROWSE_SPEC;

/** Category-root filters shown only on business browse (not listing/need fields). */
export const BUSINESS_ROOT_SPECS: Record<string, CategoryFilterSpec> = {
  'real-estate': [
    {
      key: 'serviceKind',
      label: 'نوع فعالیت',
      kind: 'chips',
      options: [
        { value: 'agency', label: 'آژانس' },
        { value: 'partnership', label: 'مشارکت' },
        { value: 'presale', label: 'پیش‌فروش' },
      ],
      audience: 'business',
      browse: true,
      intake: false,
    },
  ],
  services: [
    {
      key: 'serviceCategory',
      label: 'حوزه فعالیت',
      kind: 'chips',
      options: [
        { value: 'repairs', label: 'تعمیرات' },
        { value: 'cleaning', label: 'نظافت' },
        { value: 'transport', label: 'حمل و نقل' },
        { value: 'plumbing', label: 'لوله‌کشی' },
        { value: 'moving', label: 'اسباب‌کشی' },
        { value: 'electrical', label: 'برق‌کاری' },
        { value: 'painting', label: 'نقاشی' },
        { value: 'medical', label: 'درمانی' },
        { value: 'legal', label: 'حقوقی' },
        { value: 'it', label: 'فناوری' },
        { value: 'other', label: 'سایر' },
      ],
      audience: 'business',
      browse: true,
      intake: false,
    },
  ],
};

export const ROOT_SPECS: Record<string, CategoryFilterSpec> = {
  'real-estate': [
    { key: 'dealType', label: 'نوع معامله', kind: 'chips', options: [...DEAL_TYPE_PROPERTY], required: true, ...G },
    { key: 'propertyKind', label: 'نوع ملک', kind: 'chips', options: [...PROPERTY_KIND], ...G },
    { key: 'rooms', label: 'تعداد خواب', kind: 'chips', options: [...ROOMS], showIf: { field: 'propertyKind', in: ['apartment', 'villa'] }, ...G },
    { key: 'areaMin', label: 'حداقل متراژ (متر)', kind: 'range', urlParam: 'area', showIf: { field: 'propertyKind', in: ['apartment', 'villa', 'office', 'shop'] }, ...G },
    { key: 'budget', label: 'بودجه / قیمت', kind: 'range', showIf: { field: 'dealType', in: ['buy', 'sell'] }, browse: false, intake: true },
    { key: 'rahnAmount', label: 'مبلغ رهن', kind: 'range', showIf: { field: 'dealType', in: ['rent_rahn_full', 'rent_rahn_ejare'] }, browse: false, intake: true },
    { key: 'deposit', label: 'ودیعه', kind: 'range', showIf: { field: 'dealType', in: ['rent_rahn_ejare', 'rent_monthly'] }, browse: false, intake: true },
    { key: 'monthlyRent', label: 'اجاره ماهانه', kind: 'range', showIf: { field: 'dealType', in: ['rent_monthly', 'rent_rahn_ejare'] }, browse: false, intake: true },
    { key: 'amenities', label: 'امکانات', kind: 'multi', options: [...AMENITIES], showIf: { field: 'propertyKind', in: ['apartment', 'villa'] }, browse: true, intake: true },
    { key: '_urgent', label: 'فوری', kind: 'toggle', globalKey: 'urgent', browse: true, intake: false },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  vehicles: [
    { key: 'dealType', label: 'نوع معامله', kind: 'chips', options: [...DEAL_TYPE_VEHICLE], required: true, ...G },
    { key: 'vehicleKind', label: 'نوع وسیله', kind: 'chips', options: [...VEHICLE_KIND], showIf: { field: 'dealType', in: ['buy', 'sell', 'rent'] }, ...G },
    { key: 'condition', label: 'وضعیت', kind: 'chips', options: [...CONDITION], showIf: { field: 'dealType', in: ['buy', 'sell'] }, ...G },
    { key: 'yearMin', label: 'سال ساخت', kind: 'range', urlParam: 'year', showIf: { field: 'dealType', in: ['buy', 'rent'] }, ...G },
    { key: 'mileageMax', label: 'حداکثر کارکرد (کیلومتر)', kind: 'range', urlParam: 'mileage', showIf: { field: 'dealType', in: ['buy', 'sell'] }, browse: true, intake: true },
    { key: 'brand', label: 'برند / مدل', kind: 'text', placeholder: 'مثلاً پژو ۲۰۶', browse: false, intake: true },
    { key: 'budget', label: 'بودجه / قیمت', kind: 'range', showIf: { field: 'dealType', in: ['buy', 'sell', 'rent', 'parts'] }, browse: false, intake: true },
    { key: 'serviceType', label: 'شرح خدمات', kind: 'text', showIf: { field: 'dealType', equals: 'service' }, browse: false, intake: true },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  electronics: [
    { key: 'dealType', label: 'خرید / فروش', kind: 'chips', options: [...DEAL_TYPE_PRODUCT], required: true, ...G },
    { key: 'productName', label: 'نام کالا', kind: 'text', required: true, browse: false, intake: true },
    { key: 'condition', label: 'وضعیت', kind: 'chips', options: [...CONDITION], ...G },
    { key: 'budget', label: 'بودجه / قیمت', kind: 'range', browse: false, intake: true },
    { key: 'storage', label: 'حافظه', kind: 'chips', options: [...STORAGE_MOBILE], browse: true, intake: true },
    { key: 'ram', label: 'رم', kind: 'chips', options: [...RAM_OPTIONS], browse: true, intake: true },
    { key: '_urgent', label: 'فوری', kind: 'toggle', globalKey: 'urgent', browse: true, intake: false },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  'home-appliances': [
    { key: 'dealType', label: 'خرید / فروش', kind: 'chips', options: [...DEAL_TYPE_PRODUCT], ...G },
    { key: 'condition', label: 'وضعیت', kind: 'chips', options: [...CONDITION], ...G },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  services: [
    { key: 'serviceCategory', label: 'دسته خدمات', kind: 'chips', options: [
      { value: 'repairs', label: 'تعمیرات' },
      { value: 'cleaning', label: 'نظافت' },
      { value: 'transport', label: 'حمل و نقل' },
      { value: 'plumbing', label: 'لوله‌کشی' },
      { value: 'moving', label: 'اسباب‌کشی' },
      { value: 'electrical', label: 'برق‌کاری' },
      { value: 'painting', label: 'نقاشی' },
      { value: 'medical', label: 'درمانی' },
      { value: 'legal', label: 'حقوقی' },
      { value: 'it', label: 'فناوری' },
      { value: 'other', label: 'سایر' },
    ], required: true, browse: false, intake: true },
    { key: 'serviceType', label: 'شرح خدمت', kind: 'text', required: true, browse: false, intake: true },
    { key: 'when', label: 'زمان', kind: 'chips', options: [...SERVICE_WHEN], ...G },
    { key: 'budget', label: 'بودجه تقریبی', kind: 'range', browse: false, intake: true },
    { key: '_urgent', label: 'فوری', kind: 'toggle', globalKey: 'urgent', browse: true, intake: false },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  jobs: [
    { key: 'roleType', label: 'نوع آگهی', kind: 'chips', options: [...ROLE_TYPE], required: true, ...G },
    { key: 'jobTitle', label: 'عنوان شغل', kind: 'text', required: true, browse: false, intake: true },
    { key: 'employmentType', label: 'نوع همکاری', kind: 'chips', options: [...EMPLOYMENT_TYPE], ...G },
    { key: 'salaryMin', label: 'حقوق', kind: 'range', urlParam: 'salary', showIf: { field: 'roleType', equals: 'hiring' }, ...G },
    { key: 'experience', label: 'سابقه', kind: 'chips', options: [...EXPERIENCE], showIf: { field: 'roleType', equals: 'seeking' }, ...G },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  social: [
    { key: 'socialType', label: 'نوع', kind: 'chips', options: [...SOCIAL_TYPE], ...G },
    { key: '_urgent', label: 'فوری', kind: 'toggle', globalKey: 'urgent', browse: true, intake: false },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  'personal-items': [
    { key: 'dealType', label: 'خرید / فروش', kind: 'chips', options: [...DEAL_TYPE_PRODUCT], ...G },
    { key: 'condition', label: 'وضعیت', kind: 'chips', options: [...CONDITION], ...G },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
  entertainment: [
    { key: 'dealType', label: 'خرید / فروش', kind: 'chips', options: [...DEAL_TYPE_PRODUCT], ...G },
    { key: 'condition', label: 'وضعیت', kind: 'chips', options: [...CONDITION], ...G },
    { key: '_recent', label: 'بازه زمانی', kind: 'select', globalKey: 'recent', browse: true, intake: false },
  ],
};

export const PARENT_SPECS: Record<string, CategoryFilterSpec> = {
  'mobile-tablet': [
    { key: 'storage', label: 'حافظه', kind: 'chips', options: [...STORAGE_MOBILE], browse: true, intake: true },
  ],
  'mobile-phone': [
    { key: 'storage', label: 'حافظه', kind: 'chips', options: [...STORAGE_MOBILE], browse: true, intake: true },
  ],
  computer: [
    { key: 'ram', label: 'رم', kind: 'chips', options: [...RAM_OPTIONS], browse: true, intake: true },
    { key: 'storage', label: 'حافظه', kind: 'chips', options: [...STORAGE_MOBILE], browse: true, intake: true },
  ],
  laptop: [
    { key: 'ram', label: 'رم', kind: 'chips', options: [...RAM_OPTIONS], browse: true, intake: true },
  ],
  'desktop-computer': [
    { key: 'ram', label: 'رم', kind: 'chips', options: [...RAM_OPTIONS], browse: true, intake: true },
  ],
  'real-estate-services': [
    { key: 'serviceKind', label: 'نوع خدمات', kind: 'chips', options: [
      { value: 'agency', label: 'آژانس' },
      { value: 'partnership', label: 'مشارکت' },
      { value: 'presale', label: 'پیش‌فروش' },
    ], browse: true, intake: true },
  ],
  'pre-sale-services': [
    { key: 'dealType', label: 'نوع درخواست', kind: 'chips', options: [
      { value: 'buy', label: 'خرید واحد' },
      { value: 'sell', label: 'فروش / واگذاری' },
      { value: 'consult', label: 'مشاوره' },
    ], required: true, browse: true, intake: true },
    { key: 'projectName', label: 'نام پروژه', kind: 'text', browse: false, intake: true },
    { key: 'delivery', label: 'زمان تحویل', kind: 'chips', options: [...DELIVERY_PRE_SALE], browse: true, intake: true },
    { key: 'propertyKind', label: 'نوع پروژه', kind: 'chips', options: [
      { value: 'apartment', label: 'آپارتمان' },
      { value: 'villa', label: 'ویلایی' },
      { value: 'commercial', label: 'تجاری' },
    ], browse: true, intake: true },
  ],
  pets: [
    { key: 'petType', label: 'نوع حیوان', kind: 'chips', options: [...PET_TYPE], browse: true, intake: true },
  ],
};

export const LEAF_SPECS: Record<string, CategoryFilterSpec> = {
  'land-sale': [
    { key: 'rooms', label: 'تعداد خواب', kind: 'chips', options: [...ROOMS], browse: false, intake: false },
    { key: 'amenities', label: 'امکانات', kind: 'multi', options: [...AMENITIES], browse: false, intake: false },
  ],
  'spare-parts': [
    { key: 'yearMin', label: 'سال ساخت', kind: 'range', urlParam: 'year', browse: false, intake: false },
    { key: 'mileageMax', label: 'کارکرد', kind: 'range', urlParam: 'mileage', browse: false, intake: false },
    { key: 'vehicleKind', label: 'نوع وسیله', kind: 'chips', options: [...VEHICLE_KIND], browse: false, intake: false },
  ],
  boat: [
    { key: 'vehicleKind', label: 'نوع وسیله', kind: 'chips', options: [...VEHICLE_KIND], browse: false, intake: false },
  ],
};

/** Intake-only tail fields appended to every vertical schema. */
export const INTAKE_TAIL: CategoryFilterSpec = [
  { key: 'location', label: 'شهر و محله', kind: 'text', placeholder: 'مثلاً تهران، ولنجک', browse: false, intake: true },
  { key: 'details', label: 'توضیحات تکمیلی', kind: 'text', placeholder: 'جزئیات بیشتر…', browse: false, intake: true },
];

/** @deprecated Use GLOBAL_BUSINESS_BROWSE_SPEC */
export const BUSINESS_BROWSE_SPEC = GLOBAL_BUSINESS_BROWSE_SPEC;
