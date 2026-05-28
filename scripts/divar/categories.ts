/** Divar browse slug ↔ NiazFinder canonical leaf slug (Tehran default). */
export interface DivarResearchCategory {
  /** NiazFinder canonical slug */
  nfSlug: string;
  /** Divar path segment under /s/{city}/ */
  divarSlug: string;
  titleFa: string;
}

export const DIVAR_REAL_ESTATE_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'apartment-sale', divarSlug: 'buy-apartment', titleFa: 'فروش آپارتمان' },
  { nfSlug: 'villa-sale', divarSlug: 'buy-villa', titleFa: 'فروش خانه و ویلا' },
  { nfSlug: 'land-sale', divarSlug: 'buy-old-house', titleFa: 'فروش زمین و کلنگی' },
  { nfSlug: 'apartment-rent', divarSlug: 'rent-apartment', titleFa: 'اجاره آپارتمان' },
  { nfSlug: 'villa-rent', divarSlug: 'rent-villa', titleFa: 'اجاره ویلا' },
  { nfSlug: 'land-rent', divarSlug: 'rent-old-house', titleFa: 'اجاره زمین' },
  { nfSlug: 'office-sale', divarSlug: 'buy-office', titleFa: 'فروش دفتر' },
  { nfSlug: 'shop-sale', divarSlug: 'buy-store', titleFa: 'فروش مغازه' },
  { nfSlug: 'industrial-sale', divarSlug: 'buy-industrial-agricultural-property', titleFa: 'فروش صنعتی' },
  { nfSlug: 'office-rent', divarSlug: 'rent-office', titleFa: 'اجاره دفتر' },
  { nfSlug: 'shop-rent', divarSlug: 'rent-store', titleFa: 'اجاره مغازه' },
  { nfSlug: 'industrial-rent', divarSlug: 'rent-industrial-agricultural-property', titleFa: 'اجاره صنعتی' },
  { nfSlug: 'suite-apartment-rent', divarSlug: 'rent-temporary-suite-apartment', titleFa: 'اجاره کوتاه‌مدت آپارتمان' },
  { nfSlug: 'villa-short-rent', divarSlug: 'rent-temporary-villa', titleFa: 'اجاره کوتاه‌مدت ویلا' },
  { nfSlug: 'workspace-short-rent', divarSlug: 'rent-temporary-workspace', titleFa: 'اجاره کوتاه‌مدت دفتر' },
  { nfSlug: 'construction-partnership', divarSlug: 'contribution-construction', titleFa: 'مشارکت در ساخت' },
  { nfSlug: 'pre-sale-services', divarSlug: 'pre-sell-home', titleFa: 'پیش‌فروش' },
];

/** Persian keyword buckets for frequency analysis on listing titles. */
export const RESEARCH_KEYWORD_BUCKETS: Record<string, string[]> = {
  area: ['متر', 'متری', 'متراژ'],
  rooms: ['خواب', 'خوابه', 'بدون خواب'],
  price: ['تومان', 'میلیارد', 'میلیون', 'قیمت'],
  pricePerMeter: ['متری', 'هر متر', 'قیمت هر متر'],
  rent: ['اجاره', 'رهن', 'ودیعه', 'ماهانه'],
  shortTerm: ['شب', 'روزانه', 'کوتاه', 'نفر'],
  land: ['زمین', 'کلنگی', 'عرض'],
  partnership: ['مشارکت', 'ساخت'],
  presale: ['پیش فروش', 'پیش‌فروش', 'تحویل'],
  amenities: ['پارکینگ', 'آسانسور', 'انباری', 'بالکن', 'نوساز', 'بازسازی'],
  floor: ['طبقه', 'همکف'],
  deed: ['سند', 'تک برگ', 'تک‌برگ'],
};
