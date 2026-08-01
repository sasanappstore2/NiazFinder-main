/**
 * MaskanYaban-aligned content templates per property kind — for detail UI + crawl validation.
 * @see mini-services/estate-scrape/app/filing_feed/maskanyaban_detail.py (SPEC_LABEL_MAP)
 */
import type { FilingPropertyKind } from './attribute-schema';
import type { FilingAmenities } from '../types';

export type FilingTemplateSpecKey =
  | 'floor'
  | 'totalFloors'
  | 'unitsCount'
  | 'rooms'
  | 'buildingAge'
  | 'documentType'
  | 'cabinet'
  | 'flooring'
  | 'wallCover'
  | 'facade'
  | 'orientation'
  | 'heating'
  | 'cooling'
  | 'exchangeable'
  | 'plotWidth'
  | 'landUse'
  | 'frontage'
  | 'commercialUse';

export type FilingAmenityKey = keyof FilingAmenities;

export type FilingCategoryTemplate = {
  kind: FilingPropertyKind;
  labelFa: string;
  specsSectionTitle: string;
  specKeys: readonly FilingTemplateSpecKey[];
  quickStatKeys: readonly FilingTemplateSpecKey[];
  amenityKeys: readonly FilingAmenityKey[];
  /** Fields expected on enriched crawl rows (detail page). */
  crawlDetailRequired: readonly string[];
  crawlDetailOptional: readonly string[];
  /** Regex hints for list-card `.features` text (maskanyaban). */
  crawlListFeatureHints: readonly string[];
  /** Up to 4 spec chips on browse list cards (`/f`). */
  browseListSpecKeys: readonly FilingTemplateSpecKey[];
};

export const FILING_SPEC_LABELS: Record<FilingTemplateSpecKey, string> = {
  floor: 'طبقه',
  totalFloors: 'تعداد طبقات',
  unitsCount: 'تعداد واحدها',
  rooms: 'تعداد خواب',
  buildingAge: 'سن بنا',
  documentType: 'نوع سند',
  cabinet: 'کابینت',
  flooring: 'کفپوش',
  wallCover: 'دیوارپوش',
  facade: 'نما',
  orientation: 'جهت ملک',
  heating: 'گرمایش',
  cooling: 'سرمایش',
  exchangeable: 'قابلیت معاوضه',
  plotWidth: 'عرض زمین',
  landUse: 'کاربری',
  frontage: 'طول بر',
  commercialUse: 'نوع کاربری',
};

const CORE_CRAWL = ['fileCode', 'dealType', 'propertyKind', 'area', 'location'] as const;

export const FILING_CATEGORY_TEMPLATES: Record<FilingPropertyKind, FilingCategoryTemplate> = {
  apartment: {
    kind: 'apartment',
    labelFa: 'آپارتمان',
    specsSectionTitle: 'مشخصات آپارتمان',
    specKeys: [
      'floor',
      'totalFloors',
      'unitsCount',
      'rooms',
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
    ],
    quickStatKeys: ['floor', 'rooms', 'buildingAge', 'orientation'],
    amenityKeys: [
      'parking',
      'storage',
      'elevator',
      'terrace',
      'builtInWardrobe',
      'securityDoor',
      'builtInGas',
      'exchangeable',
    ],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'deposit', 'monthlyRent'],
    crawlDetailOptional: [
      'floor',
      'totalFloors',
      'unitsCount',
      'rooms',
      'buildingAge',
      'documentType',
      'cabinet',
      'flooring',
      'wallCover',
      'facade',
      'orientation',
      'heating',
      'cooling',
      'pricePerMeter',
      'description',
      'image',
      'hasParking',
      'hasStorage',
      'hasElevator',
      'hasSecurityDoor',
      'hasTerrace',
      'hasBuiltInWardrobe',
    ],
    crawlListFeatureHints: ['طبقه', 'خواب', 'سال ساخت', 'سند', 'آسانسور', 'پارکینگ'],
    browseListSpecKeys: ['floor', 'rooms', 'buildingAge', 'documentType'],
  },
  villa: {
    kind: 'villa',
    labelFa: 'خانه ویلایی',
    specsSectionTitle: 'مشخصات ویلا',
    specKeys: [
      'rooms',
      'buildingAge',
      'totalFloors',
      'floor',
      'documentType',
      'facade',
      'orientation',
      'cabinet',
      'flooring',
      'wallCover',
      'heating',
      'cooling',
      'exchangeable',
    ],
    quickStatKeys: ['rooms', 'buildingAge', 'orientation', 'documentType'],
    amenityKeys: [
      'parking',
      'storage',
      'terrace',
      'builtInWardrobe',
      'securityDoor',
      'builtInGas',
      'exchangeable',
    ],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'deposit', 'monthlyRent'],
    crawlDetailOptional: [
      'rooms',
      'buildingAge',
      'totalFloors',
      'floor',
      'documentType',
      'facade',
      'orientation',
      'cabinet',
      'flooring',
      'wallCover',
      'heating',
      'cooling',
      'pricePerMeter',
      'description',
      'image',
      'hasParking',
      'hasStorage',
      'hasTerrace',
      'hasBuiltInWardrobe',
      'hasSecurityDoor',
    ],
    crawlListFeatureHints: ['خواب', 'سال ساخت', 'سند', 'پارکینگ', 'تراس'],
    browseListSpecKeys: ['rooms', 'buildingAge', 'orientation', 'documentType'],
  },
  land: {
    kind: 'land',
    labelFa: 'زمین',
    specsSectionTitle: 'مشخصات زمین',
    specKeys: [
      'landUse',
      'documentType',
      'orientation',
      'frontage',
      'plotWidth',
      'exchangeable',
    ],
    quickStatKeys: ['landUse', 'documentType', 'orientation', 'frontage'],
    amenityKeys: ['exchangeable'],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'pricePerMeter'],
    crawlDetailOptional: [
      'landUse',
      'documentType',
      'orientation',
      'frontage',
      'plotWidth',
      'deposit',
      'monthlyRent',
      'description',
      'image',
    ],
    crawlListFeatureHints: ['سند', 'جهت', 'کاربری', 'متری', 'بر'],
    browseListSpecKeys: ['landUse', 'documentType', 'orientation', 'frontage'],
  },
  shop: {
    kind: 'shop',
    labelFa: 'مغازه',
    specsSectionTitle: 'مشخصات مغازه',
    specKeys: [
      'floor',
      'buildingAge',
      'documentType',
      'commercialUse',
      'frontage',
      'orientation',
      'heating',
      'cooling',
      'exchangeable',
    ],
    quickStatKeys: ['floor', 'buildingAge', 'frontage', 'documentType'],
    amenityKeys: ['parking', 'storage', 'securityDoor', 'exchangeable'],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'deposit', 'monthlyRent'],
    crawlDetailOptional: [
      'floor',
      'buildingAge',
      'documentType',
      'commercialUse',
      'frontage',
      'orientation',
      'heating',
      'cooling',
      'pricePerMeter',
      'description',
      'image',
      'hasParking',
      'hasStorage',
      'hasSecurityDoor',
    ],
    crawlListFeatureHints: ['طبقه', 'سند', 'سال ساخت', 'پارکینگ'],
    browseListSpecKeys: ['floor', 'buildingAge', 'frontage', 'documentType'],
  },
  office: {
    kind: 'office',
    labelFa: 'دفتر کار',
    specsSectionTitle: 'مشخصات دفتر',
    specKeys: [
      'floor',
      'totalFloors',
      'rooms',
      'buildingAge',
      'documentType',
      'orientation',
      'heating',
      'cooling',
      'exchangeable',
    ],
    quickStatKeys: ['floor', 'rooms', 'buildingAge', 'orientation'],
    amenityKeys: ['parking', 'storage', 'elevator', 'securityDoor', 'exchangeable'],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'deposit', 'monthlyRent'],
    crawlDetailOptional: [
      'floor',
      'totalFloors',
      'rooms',
      'buildingAge',
      'documentType',
      'orientation',
      'heating',
      'cooling',
      'description',
      'image',
      'hasParking',
      'hasElevator',
    ],
    crawlListFeatureHints: ['طبقه', 'خواب', 'سند', 'آسانسور'],
    browseListSpecKeys: ['floor', 'rooms', 'buildingAge', 'documentType'],
  },
  commercial: {
    kind: 'commercial',
    labelFa: 'تجاری',
    specsSectionTitle: 'مشخصات ملک تجاری',
    specKeys: [
      'floor',
      'buildingAge',
      'documentType',
      'commercialUse',
      'frontage',
      'orientation',
      'heating',
      'cooling',
      'exchangeable',
    ],
    quickStatKeys: ['floor', 'buildingAge', 'frontage', 'commercialUse'],
    amenityKeys: ['parking', 'storage', 'securityDoor', 'exchangeable'],
    crawlDetailRequired: [...CORE_CRAWL, 'price', 'deposit', 'monthlyRent'],
    crawlDetailOptional: [
      'floor',
      'buildingAge',
      'documentType',
      'commercialUse',
      'frontage',
      'orientation',
      'heating',
      'cooling',
      'description',
      'image',
    ],
    crawlListFeatureHints: ['طبقه', 'سند', 'پارکینگ'],
    browseListSpecKeys: ['floor', 'buildingAge', 'frontage', 'commercialUse'],
  },
};

const DEFAULT_KIND: FilingPropertyKind = 'apartment';

export function resolveFilingCategoryTemplate(
  propertyKind: FilingPropertyKind | string | null | undefined
): FilingCategoryTemplate {
  if (propertyKind && propertyKind in FILING_CATEGORY_TEMPLATES) {
    return FILING_CATEGORY_TEMPLATES[propertyKind as FilingPropertyKind];
  }
  return FILING_CATEGORY_TEMPLATES[DEFAULT_KIND];
}

/** JSON manifest for crawl onboarding / validation tooling. */
export function exportFilingCrawlManifest(): Record<
  FilingPropertyKind,
  {
    labelFa: string;
    specsSectionTitle: string;
    specLabels: Record<string, string>;
    crawlDetailRequired: readonly string[];
    crawlDetailOptional: readonly string[];
    crawlListFeatureHints: readonly string[];
  }
> {
  return Object.fromEntries(
    Object.entries(FILING_CATEGORY_TEMPLATES).map(([kind, tpl]) => [
      kind,
      {
        labelFa: tpl.labelFa,
        specsSectionTitle: tpl.specsSectionTitle,
        specLabels: Object.fromEntries(
          tpl.specKeys.map((key) => [key, FILING_SPEC_LABELS[key]])
        ),
        crawlDetailRequired: tpl.crawlDetailRequired,
        crawlDetailOptional: tpl.crawlDetailOptional,
        crawlListFeatureHints: tpl.crawlListFeatureHints,
      },
    ])
  ) as Record<FilingPropertyKind, {
    labelFa: string;
    specsSectionTitle: string;
    specLabels: Record<string, string>;
    crawlDetailRequired: readonly string[];
    crawlDetailOptional: readonly string[];
    crawlListFeatureHints: readonly string[];
  }>;
}

export function amenityLabelFa(key: FilingAmenityKey): string {
  const map: Record<FilingAmenityKey, string> = {
    parking: 'پارکینگ',
    storage: 'انباری',
    elevator: 'آسانسور',
    securityDoor: 'درب ضدسرقت',
    exchangeable: 'قابل معاوضه',
    terrace: 'تراس',
    builtInWardrobe: 'کمد دیواری',
    builtInGas: 'گاز روکار',
  };
  return map[key];
}
