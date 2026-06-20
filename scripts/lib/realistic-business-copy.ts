/** Persian copy for realistic business seed — keep this file UTF-8. */

export const BRAND_NAMES = [
  'آریا', 'پارس', 'نوین', 'سپهر', 'رادین', 'مهر', 'سامان', 'آذر', 'کیان', 'پویا',
  'رها', 'نیک', 'برنا', 'طلوع', 'امید', 'آسمان', 'ستاره', 'تابان', 'فراز', 'دیبا',
];

export const REVIEWER_NAMES = [
  'علی محمدی', 'سارا احمدی', 'رضا کریمی', 'مریم حسینی', 'امیر رضایی', 'فاطمه موسوی',
  'حسین نوری', 'زهرا صادقی', 'مهدی جعفری', 'نرگس قاسمی', 'پویا اکبری', 'لیلا مرادی',
];

export const STREET_NAMES = ['ولیعصر', 'انقلاب', 'آزادی', 'شریعتی', 'جمهوری'];

export const OFFER_PRICE_RANGES = [
  'از ۵۰۰ هزار تومان', 'از ۲ میلیون', 'از ۵ میلیون', 'توافقی', 'رایگان (بازدید اول)',
  'از ۱ میلیون تومان', 'از ۳ میلیون', 'تماس بگیرید',
];

export const RESPONSE_TIMES = ['کمتر از ۱ ساعت', 'همان روز', '۲۴ ساعت'];

export const OFFER_DURATIONS = ['همان روز', '۲۴ ساعت', '۲-۳ روز', 'یک هفته'];

export const OFFER_FEATURES = ['ضمانت کیفیت', 'مشاوره رایگان'];

export const REVIEW_COMMENTS = [
  'کار تمیز و به موقع انجام شد. حتماً دوباره هماهنگ می‌کنم.',
  'برخورد محترمانه و قیمت منصفانه بود.',
  'پاسخگویی سریع و نتیجه خوب؛ از تجربه راضی بودم.',
  'به موقع رسیدند و کار را حرفه‌ای انجام دادند.',
];

export const BADGES_VERIFIED = ['تأیید شده', 'پیشنهاد ویژه'];
export const BADGES_DEFAULT = ['پاسخ سریع'];

export function buildBusinessName(occupationTitle: string, cityTitle: string, brand: string): string {
  return `${occupationTitle} ${brand} — ${cityTitle}`;
}

export function buildBusinessDescription(
  occupationTitle: string,
  cityTitle: string,
  provinceTitle: string,
  years: number
): string {
  return [
    `${occupationTitle} با بیش از ${years} سال سابقه در ${cityTitle} و استان ${provinceTitle}.`,
    'ارائه‌دهنده خدمات حرفه‌ای با تیم مجرب و تجهیزات استاندارد.',
    'مشاوره رایگان، قیمت شفاف و پشتیبانی پس از انجام کار.',
  ].join(' ');
}

export function buildAddress(cityTitle: string, street: string, number: number): string {
  return `${cityTitle}، خیابان ${street}، پلاک ${number}`;
}

export function buildOfferDescription(title: string, cityTitle: string): string {
  return `${title} در ${cityTitle} با کیفیت تضمینی و قیمت منصفانه.`;
}

export function buildOfferTitles(occupationTitle: string): string[] {
  return [`خدمات ${occupationTitle}`, 'مشاوره و بازدید', 'پکیج اقتصادی'];
}

export function portfolioTitle(cityTitle: string): string {
  return `نمونه کار در ${cityTitle}`;
}
