/** Shared option sets for category filters and intake. */

export const DEAL_TYPE_PROPERTY = [
  { value: 'buy', label: 'خرید' },
  { value: 'sell', label: 'فروش' },
  { value: 'rent_monthly', label: 'اجاره ماهانه' },
  { value: 'rent_rahn_full', label: 'رهن کامل' },
  { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
  { value: 'rent_short_term', label: 'اجاره کوتاه‌مدت (روزانه)' },
] as const;

export const DEAL_TYPE_VEHICLE = [
  { value: 'buy', label: 'خرید' },
  { value: 'sell', label: 'فروش' },
  { value: 'rent', label: 'اجاره' },
  { value: 'service', label: 'خدمات / تعمیر' },
  { value: 'parts', label: 'قطعات یدکی' },
] as const;

export const DEAL_TYPE_PRODUCT = [
  { value: 'buy', label: 'می‌خرم' },
  { value: 'sell', label: 'می‌فروشم' },
] as const;

export const PROPERTY_KIND = [
  { value: 'apartment', label: 'آپارتمان' },
  { value: 'villa', label: 'خانه / ویلا' },
  { value: 'land', label: 'زمین' },
  { value: 'office', label: 'دفتر کار' },
  { value: 'shop', label: 'مغازه' },
  { value: 'industrial', label: 'صنعتی' },
] as const;

export const ROOMS = [
  { value: '1', label: '۱ خواب' },
  { value: '2', label: '۲ خواب' },
  { value: '3', label: '۳ خواب' },
  { value: '4+', label: '۴+ خواب' },
  { value: 'studio', label: 'سوئیت' },
] as const;

export const AMENITIES = [
  { value: 'parking', label: 'پارکینگ' },
  { value: 'elevator', label: 'آسانسور' },
  { value: 'storage', label: 'انباری' },
  { value: 'furnished', label: 'مبله' },
  { value: 'balcony', label: 'بالکن' },
  { value: 'renovated', label: 'بازسازی‌شده' },
] as const;

/** Guest count for short-term rent (Divar: تعداد نفرات). */
export const GUEST_COUNT = [
  { value: '1', label: '۱ نفر' },
  { value: '2', label: '۲ نفر' },
  { value: '3', label: '۳ نفر' },
  { value: '4', label: '۴ نفر' },
  { value: '5+', label: '۵ نفر و بیشتر' },
] as const;

/** Deed type for sale listings (Divar: سند). */
export const DEED_TYPE = [
  { value: 'single_sheet', label: 'تک‌برگ' },
  { value: 'multi_owner', label: 'مشاعی' },
  { value: 'power_of_attorney', label: 'وکالتی' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

/** Household size for rental intake (رهن/اجاره). */
export const FAMILY_COUNT = [
  { value: '1', label: '۱ نفر' },
  { value: '2', label: '۲ نفر' },
  { value: '3', label: '۳ نفر' },
  { value: '4+', label: '۴ نفر و بیشتر' },
] as const;

export const CONDITION = [
  { value: 'new', label: 'نو' },
  { value: 'like_new', label: 'در حد نو' },
  { value: 'used', label: 'کارکرده' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const VEHICLE_KIND = [
  { value: 'car', label: 'خودرو سواری' },
  { value: 'heavy', label: 'سنگین' },
  { value: 'motorcycle', label: 'موتور' },
  { value: 'classic', label: 'کلاسیک' },
] as const;

export const STORAGE_MOBILE = [
  { value: '64', label: '۶۴ گیگ' },
  { value: '128', label: '۱۲۸ گیگ' },
  { value: '256', label: '۲۵۶ گیگ' },
  { value: '512', label: '۵۱۲+ گیگ' },
] as const;

export const RAM_OPTIONS = [
  { value: '8', label: '۸ گیگ' },
  { value: '16', label: '۱۶ گیگ' },
  { value: '32', label: '۳۲+ گیگ' },
] as const;

export const SERVICE_WHEN = [
  { value: 'today', label: 'امروز / فوری' },
  { value: 'week', label: 'این هفته' },
  { value: 'month', label: 'این ماه' },
  { value: 'flexible', label: 'انعطاف‌پذیر' },
] as const;

export const ROLE_TYPE = [
  { value: 'hiring', label: 'استخدام' },
  { value: 'seeking', label: 'جستجوی کار' },
] as const;

export const EMPLOYMENT_TYPE = [
  { value: 'full', label: 'تمام‌وقت' },
  { value: 'part', label: 'پاره‌وقت' },
  { value: 'remote', label: 'دورکاری' },
  { value: 'project', label: 'پروژه‌ای' },
  { value: 'intern', label: 'کارآموزی' },
] as const;

export const EXPERIENCE = [
  { value: 'junior', label: 'کمتر از ۲ سال' },
  { value: 'mid', label: '۲ تا ۵ سال' },
  { value: 'senior', label: 'بیش از ۵ سال' },
] as const;

export const SOCIAL_TYPE = [
  { value: 'lost', label: 'گم‌شده' },
  { value: 'volunteer', label: 'داوطلبانه' },
  { value: 'event', label: 'رویداد' },
  { value: 'help', label: 'کمک' },
] as const;

export const DELIVERY_PRE_SALE = [
  { value: 'ready', label: 'تحویل فوری' },
  { value: '6m', label: 'تا ۶ ماه' },
  { value: '1y', label: 'تا ۱ سال' },
  { value: '2y+', label: 'بیش از ۱ سال' },
] as const;

export const PET_TYPE = [
  { value: 'dog', label: 'سگ' },
  { value: 'cat', label: 'گربه' },
  { value: 'bird', label: 'پرنده' },
  { value: 'other', label: 'سایر' },
] as const;
