/** Divar browse slug ↔ NiazFinder canonical leaf slug (Tehran default). */
export interface DivarResearchCategory {
  nfSlug: string;
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

export const DIVAR_VEHICLE_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'car-ride', divarSlug: 'light', titleFa: 'خودرو سواری' },
  { nfSlug: 'car-heavy', divarSlug: 'heavy', titleFa: 'خودرو سنگین' },
  { nfSlug: 'car-classic', divarSlug: 'classic', titleFa: 'خودرو کلاسیک' },
  { nfSlug: 'car-rental', divarSlug: 'rental', titleFa: 'اجاره خودرو' },
  { nfSlug: 'motorcycle', divarSlug: 'motorcycles', titleFa: 'موتورسیکلت' },
  { nfSlug: 'spare-parts', divarSlug: 'parts-accessories', titleFa: 'قطعات یدکی' },
  { nfSlug: 'boat', divarSlug: 'boat', titleFa: 'قایق' },
];

export const DIVAR_ELECTRONICS_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'mobile-phone', divarSlug: 'mobile-phones', titleFa: 'گوشی موبایل' },
  { nfSlug: 'tablet', divarSlug: 'tablet', titleFa: 'تبلت' },
  { nfSlug: 'mobile-accessories', divarSlug: 'mobile-tablet-accessories', titleFa: 'لوازم جانبی موبایل' },
  { nfSlug: 'laptop', divarSlug: 'laptops', titleFa: 'لپ‌تاپ' },
  { nfSlug: 'desktop-computer', divarSlug: 'computers', titleFa: 'رایانه' },
  { nfSlug: 'computer-parts', divarSlug: 'computer-parts-accessories', titleFa: 'قطعات کامپیوتر' },
  { nfSlug: 'game-console', divarSlug: 'game-consoles', titleFa: 'کنسول بازی' },
  { nfSlug: 'audio-video', divarSlug: 'audio-video', titleFa: 'صوتی تصویری' },
  { nfSlug: 'camera', divarSlug: 'camera-camcorder', titleFa: 'دوربین' },
];

export const DIVAR_HOME_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'refrigerator', divarSlug: 'refrigerator-freezer', titleFa: 'یخچال' },
  { nfSlug: 'washing-machine', divarSlug: 'washing-machines', titleFa: 'ماشین لباسشویی' },
  { nfSlug: 'sofa-chair', divarSlug: 'sofa-couch', titleFa: 'مبل' },
  { nfSlug: 'rugs', divarSlug: 'carpet-moquette', titleFa: 'فرش' },
];

export const DIVAR_SERVICES_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'cleaning', divarSlug: 'cleaning', titleFa: 'نظافت' },
  { nfSlug: 'repairs', divarSlug: 'repairs', titleFa: 'تعمیرات' },
  { nfSlug: 'moving', divarSlug: 'moving', titleFa: 'اسباب‌کشی' },
  { nfSlug: 'education', divarSlug: 'education', titleFa: 'آموزش' },
];

export const DIVAR_JOBS_CATEGORIES: DivarResearchCategory[] = [
  { nfSlug: 'it', divarSlug: 'it-computer', titleFa: 'فناوری' },
  { nfSlug: 'admin-management', divarSlug: 'administration', titleFa: 'اداری' },
  { nfSlug: 'marketing-sales', divarSlug: 'marketing-sales', titleFa: 'بازاریابی' },
  { nfSlug: 'engineering', divarSlug: 'technical-engineering', titleFa: 'فنی' },
];

export const DIVAR_ALL_VERTICALS: DivarResearchCategory[] = [
  ...DIVAR_REAL_ESTATE_CATEGORIES,
  ...DIVAR_VEHICLE_CATEGORIES,
  ...DIVAR_ELECTRONICS_CATEGORIES,
  ...DIVAR_HOME_CATEGORIES,
  ...DIVAR_SERVICES_CATEGORIES,
  ...DIVAR_JOBS_CATEGORIES,
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
