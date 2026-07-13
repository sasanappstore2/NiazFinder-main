import type { FilingDealType } from '@/lib/filing/schema/attribute-schema';
import type { FilingFilterSpec } from './filter-types';
import { FILING_AMENITY_OPTIONS, FILING_ROOMS_OPTIONS } from './filter-options';

const R = { kind: 'range' as const };

/** Shared filing browse filters — aligned with maskanyaban portal bar. */
export const FILING_COMMON_FILTER_SPEC: FilingFilterSpec = [
  { key: 'q', label: 'جستجو', kind: 'text', placeholder: 'عنوان، محله، توضیحات…' },
  { key: 'fileCode', label: 'کد فایل', kind: 'text', placeholder: 'کد فایل' },
  { key: 'region', label: 'منطقه', kind: 'chips' },
  { key: 'areaMin', label: 'حداقل متراژ', kind: 'range', urlParam: 'area' },
  { key: 'areaMax', label: 'حداکثر متراژ', kind: 'range', urlParam: 'area' },
  { key: 'rooms', label: 'تعداد خواب', kind: 'chips', options: [...FILING_ROOMS_OPTIONS] },
  { key: 'buildingAgeMax', label: 'حداکثر سن بنا', kind: 'range', urlParam: 'age' },
  { key: 'floorMin', label: 'حداقل طبقه', kind: 'range', urlParam: 'floor' },
  { key: 'floorMax', label: 'حداکثر طبقه', kind: 'range', urlParam: 'floor' },
  { key: 'insertedDate', label: 'تاریخ درج', kind: 'date' },
  { key: 'amenities', label: 'امکانات', kind: 'chips', options: [...FILING_AMENITY_OPTIONS] },
];

export const FILING_SALE_FILTER_SPEC: FilingFilterSpec = [
  ...FILING_COMMON_FILTER_SPEC,
  { key: 'priceMin', label: 'حداقل قیمت (تومان)', ...R, urlParam: 'price' },
  { key: 'priceMax', label: 'حداکثر قیمت (تومان)', ...R, urlParam: 'price' },
  { key: 'pricePerMeterMin', label: 'حداقل قیمت هر متر', ...R, urlParam: 'ppm' },
  { key: 'pricePerMeterMax', label: 'حداکثر قیمت هر متر', ...R, urlParam: 'ppm' },
];

export const FILING_RENT_RAHN_EJARE_FILTER_SPEC: FilingFilterSpec = [
  ...FILING_COMMON_FILTER_SPEC,
  { key: 'depositMin', label: 'حداقل رهن (تومان)', ...R, urlParam: 'deposit' },
  { key: 'depositMax', label: 'حداکثر رهن (تومان)', ...R, urlParam: 'deposit' },
  { key: 'rentMin', label: 'حداقل اجاره (تومان)', ...R, urlParam: 'rent' },
  { key: 'rentMax', label: 'حداکثر اجاره (تومان)', ...R, urlParam: 'rent' },
];

export const FILING_RENT_RAHN_FULL_FILTER_SPEC: FilingFilterSpec = [
  ...FILING_COMMON_FILTER_SPEC,
  { key: 'depositMin', label: 'حداقل رهن کامل (تومان)', ...R, urlParam: 'deposit' },
  { key: 'depositMax', label: 'حداکثر رهن کامل (تومان)', ...R, urlParam: 'deposit' },
];

export const FILING_RENT_SHORT_TERM_FILTER_SPEC: FilingFilterSpec = [
  ...FILING_COMMON_FILTER_SPEC,
  { key: 'rentMin', label: 'حداقل اجاره (تومان)', ...R, urlParam: 'rent' },
  { key: 'rentMax', label: 'حداکثر اجاره (تومان)', ...R, urlParam: 'rent' },
];

export function filingFilterSpecForDeal(dealType: FilingDealType | 'all'): FilingFilterSpec {
  switch (dealType) {
    case 'sell':
      return FILING_SALE_FILTER_SPEC;
    case 'rent_rahn_ejare':
      return FILING_RENT_RAHN_EJARE_FILTER_SPEC;
    case 'rent_rahn_full':
      return FILING_RENT_RAHN_FULL_FILTER_SPEC;
    case 'rent_short_term':
      return FILING_RENT_SHORT_TERM_FILTER_SPEC;
    default:
      return [
        ...FILING_COMMON_FILTER_SPEC,
        { key: 'priceMin', label: 'حداقل قیمت (تومان)', ...R, urlParam: 'price' },
        { key: 'priceMax', label: 'حداکثر قیمت (تومان)', ...R, urlParam: 'price' },
        { key: 'depositMin', label: 'حداقل رهن (تومان)', ...R, urlParam: 'deposit' },
        { key: 'depositMax', label: 'حداکثر رهن (تومان)', ...R, urlParam: 'deposit' },
        { key: 'rentMin', label: 'حداقل اجاره (تومان)', ...R, urlParam: 'rent' },
        { key: 'rentMax', label: 'حداکثر اجاره (تومان)', ...R, urlParam: 'rent' },
      ];
  }
}
