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

/** Building facade / exterior. */
export const FACADE_TYPE = [
  { value: 'stone', label: 'سنگ' },
  { value: 'brick', label: 'آجر' },
  { value: 'composite', label: 'کامپوزیت' },
  { value: 'cement', label: 'سیمان' },
  { value: 'glass', label: 'شیشه' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

/** Unit / building orientation. */
export const ORIENTATION = [
  { value: 'north', label: 'شمالی' },
  { value: 'south', label: 'جنوبی' },
  { value: 'east', label: 'شرقی' },
  { value: 'west', label: 'غربی' },
  { value: 'northeast', label: 'شمال‌شرقی' },
  { value: 'northwest', label: 'شمال‌غربی' },
  { value: 'southeast', label: 'جنوب‌شرقی' },
  { value: 'southwest', label: 'جنوب‌غربی' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const HEATING = [
  { value: 'radiator', label: 'رادیاتور' },
  { value: 'package', label: 'پکیج' },
  { value: 'central', label: 'موتورخانه مرکزی' },
  { value: 'floor', label: 'از کف' },
  { value: 'split', label: 'اسپلیت گرمایشی' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const COOLING = [
  { value: 'split', label: 'اسپلیت' },
  { value: 'central', label: 'تهویه مرکزی' },
  { value: 'evaporative', label: 'کولر آبی' },
  { value: 'window', label: 'کولر گازی پنجره‌ای' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const CABINET_TYPE = [
  { value: 'mdf', label: 'ام‌دی‌اف' },
  { value: 'high_gloss', label: 'هایگلاس' },
  { value: 'wood', label: 'چوب' },
  { value: 'metal', label: 'فلزی' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const BATHROOM_COUNT = [
  { value: '1', label: '۱ سرویس' },
  { value: '2', label: '۲ سرویس' },
  { value: '3+', label: '۳+ سرویس' },
] as const;

export const PARKING_COUNT = [
  { value: '0', label: 'بدون پارکینگ' },
  { value: '1', label: '۱ پارکینگ' },
  { value: '2', label: '۲ پارکینگ' },
  { value: '3+', label: '۳+ پارکینگ' },
] as const;

export const POSTER_KIND = [
  { value: 'owner', label: 'مالک' },
  { value: 'agent', label: 'مشاور / آژانس' },
  { value: 'either', label: 'فرقی ندارد' },
] as const;

export const MOVE_IN_WHEN = [
  { value: 'immediate', label: 'فوری' },
  { value: '2w', label: 'تا ۲ هفته' },
  { value: '1m', label: 'تا ۱ ماه' },
  { value: '3m', label: 'تا ۳ ماه' },
  { value: 'flexible', label: 'انعطاف‌پذیر' },
] as const;

export const LAND_USE = [
  { value: 'residential', label: 'مسکونی' },
  { value: 'commercial', label: 'تجاری' },
  { value: 'agricultural', label: 'کشاورزی' },
  { value: 'industrial', label: 'صنعتی' },
  { value: 'mixed', label: 'مختلط' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;

export const SHORT_TERM_AMENITIES = [
  { value: 'wifi', label: 'وای‌فای' },
  { value: 'parking', label: 'پارکینگ' },
  { value: 'kitchen', label: 'آشپزخانه' },
  { value: 'washer', label: 'ماشین لباسشویی' },
  { value: 'ac', label: 'تهویه / کولر' },
  { value: 'pool', label: 'استخر' },
  { value: 'yard', label: 'حیاط' },
  { value: 'pet_friendly', label: 'حیوان خانگی مجاز' },
] as const;

/** Alias: buildingAge maps to yearMin/yearMax in browse URL params. */
export const BUILDING_AGE_CHIPS = [
  { value: '0-5', label: '۰ تا ۵ سال' },
  { value: '5-10', label: '۵ تا ۱۰ سال' },
  { value: '10-20', label: '۱۰ تا ۲۰ سال' },
  { value: '20+', label: 'بیش از ۲۰ سال' },
  { value: 'any', label: 'فرقی ندارد' },
] as const;
