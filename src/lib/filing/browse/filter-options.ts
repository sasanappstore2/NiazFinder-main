import {
  FILING_DEAL_TYPES,
  FILING_PROPERTY_KINDS,
  DEAL_TYPE_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/lib/filing/schema/attribute-schema';

export const FILING_ROOMS_OPTIONS = [
  { value: '0', label: 'بدون خواب' },
  { value: '1', label: '۱ خواب' },
  { value: '2', label: '۲ خواب' },
  { value: '3', label: '۳ خواب' },
  { value: '4', label: '۴ خواب' },
  { value: '5+', label: '۵+ خواب' },
] as const;

export const FILING_AMENITY_OPTIONS = [
  { value: 'parking', label: 'پارکینگ' },
  { value: 'storage', label: 'انباری' },
  { value: 'elevator', label: 'آسانسور' },
  { value: 'securityDoor', label: 'درب ضدسرقت' },
  { value: 'exchangeable', label: 'قابل معاوضه' },
] as const;

export const FILING_DEAL_CHIP_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...FILING_DEAL_TYPES.map((value) => ({ value, label: DEAL_TYPE_LABELS[value] })),
];

export const FILING_KIND_CHIP_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...FILING_PROPERTY_KINDS.map((value) => ({ value, label: PROPERTY_KIND_LABELS[value] })),
];

export const FILING_SORT_OPTIONS = [
  { value: 'default', label: 'پیش‌فرض' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
  { value: 'area_asc', label: 'کوچک‌ترین متراژ' },
  { value: 'area_desc', label: 'بزرگ‌ترین متراژ' },
] as const;

export type FilingSortKey = (typeof FILING_SORT_OPTIONS)[number]['value'];
