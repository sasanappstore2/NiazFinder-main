import { hasBuyIntentPhrase } from '@/lib/need-intake/product-buy-hints';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

const VEHICLE_REPAIR_PHRASES = [
  'تعمیرکار خودرو',
  'تعمیرکار ماشین',
  'مکانیک خودرو',
  'مکانیک ماشین',
  'تعمیر خودرو',
  'تعمیر ماشین',
  'تعمیر موتور',
  'موتور خراب',
  'موتور مشکل',
];

const VEHICLE_CONTEXT_WORDS = [
  'خودرو',
  'ماشین',
  'پژو',
  'پراید',
  'سمند',
  'تیبا',
  'دنا',
  'هیوند',
  'هوندا',
  'پژو ۲۰۷',
  'پژو 207',
  '۲۰۷',
  '207',
];

const REPAIR_SERVICE_WORDS = ['تعمیرکار', 'مکانیک', 'تعمیرات', 'تعمیر '];
const MOTORCYCLE_WORDS = ['موتورسیکلت', 'موتور سیکلت', 'موتوسیکلت'];

const PRODUCT_SELL_WORDS = ['میفروشم', 'می‌فروشم', 'فروش', 'میفروشیم', 'می‌فروشیم'];

const PRODUCT_DEVICE_WORDS = [
  'گوشی',
  'موبایل',
  'تبلت',
  'لپ تاپ',
  'لپتاپ',
  'کامپیوتر',
  'آیفون',
  'iphone',
  'ipad',
  'آیپد',
];

const HOME_APPLIANCE_WORDS = [
  'یخچال',
  'فریزر',
  'ماشین لباسشویی',
  'لباسشویی',
  'ماشین ظرفشویی',
  'ظرفشویی',
  'مایکروویو',
  'جاروبرقی',
  'پکیج',
  'آبگرمکن',
];

const APPLIANCE_REPAIR_SIGNALS = [
  'تعمیرکار',
  'تعمیر',
  'مکانیک',
  'خراب',
  'مشکل',
  'کار نمی',
  'کارنمی',
  'گاز داده',
  'آب چکه',
  'یخ زده',
  'سرویس',
];

function includesAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => text.includes(normalizeIntakeText(w)));
}

function hasSellIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  return PRODUCT_SELL_WORDS.some((w) => t.includes(normalizeIntakeText(w)));
}

function isApplianceServiceNeed(text: string): boolean {
  const t = normalizeIntakeText(text);
  const seeksService =
    t.includes('\u0646\u06CC\u0627\u0632 \u0628\u0647') ||
    t.includes('\u0646\u06CC\u0627\u0632 \u062F\u0627\u0631') ||
    t.includes('\u0644\u0627\u0632\u0645') ||
    t.includes('\u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631');
  if (!seeksService) return false;
  const hasAppliance = HOME_APPLIANCE_WORDS.some((w) => t.includes(normalizeIntakeText(w)));
  return hasAppliance && !hasSellIntent(text) && !t.includes('\u062E\u0631\u06CC\u062F');
}

function hasRepairSignal(text: string): boolean {
  const t = normalizeIntakeText(text);
  return includesAny(t, APPLIANCE_REPAIR_SIGNALS) || isApplianceServiceNeed(text);
}

/** Buying/selling a device (phone/laptop) — not a repair service. */
function isProductDeviceTransaction(text: string): boolean {
  const t = normalizeIntakeText(text);
  const hasDevice = PRODUCT_DEVICE_WORDS.some((w) => t.includes(normalizeIntakeText(w)));
  if (!hasDevice) return false;
  return (
    hasBuyIntentPhrase(text) ||
    hasSellIntent(text) ||
    t.includes('کارکرده') ||
    t.includes('دست دوم')
  );
}

/** Buying/selling home appliances — not repair (e.g. فروش یخچال). */
export function isHomeApplianceProductTransaction(text: string): boolean {
  const t = normalizeIntakeText(text);
  const hasAppliance = HOME_APPLIANCE_WORDS.some((w) => t.includes(normalizeIntakeText(w)));
  if (!hasAppliance) return false;
  if (hasRepairSignal(text) && !hasSellIntent(text) && !hasBuyIntentPhrase(text)) {
    return false;
  }
  return (
    hasBuyIntentPhrase(text) ||
    hasSellIntent(text) ||
    t.includes('کارکرده') ||
    t.includes('دست دوم') ||
    t.includes('در حدود عالی') ||
    t.includes('استفاده تمیز')
  );
}

function isMotorcycleProductTransaction(text: string): boolean {
  const t = normalizeIntakeText(text);
  const hasMoto =
    includesAny(t, MOTORCYCLE_WORDS) ||
    (t.includes('موتور') && !includesAny(t, VEHICLE_CONTEXT_WORDS));
  if (!hasMoto) return false;
  if (isMotorcycleRepairServiceIntent(text)) return false;
  return hasBuyIntentPhrase(text) || hasSellIntent(text) || t.includes('نیاز به');
}

/** User seeks a mechanic / repair service for a car (not buying/selling). */
export function isVehicleRepairServiceIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t) return false;

  if (includesAny(t, VEHICLE_REPAIR_PHRASES)) return true;

  const hasRepairSignal =
    t.includes('تعمیرکار') ||
    t.includes('مکانیک') ||
    (t.includes('تعمیر') && !t.includes('فروش'));
  const hasVehicleContext = includesAny(t, VEHICLE_CONTEXT_WORDS);

  if (hasRepairSignal && hasVehicleContext) return true;

  if (
    (t.includes('موتور') && (t.includes('مشکل') || t.includes('خراب'))) &&
    hasVehicleContext
  ) {
    return true;
  }

  return false;
}

export function isMotorcycleRepairServiceIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t) return false;
  const hasRepair =
    t.includes('تعمیرکار') || t.includes('تعمیر') || t.includes('مکانیک');
  return hasRepair && includesAny(t, MOTORCYCLE_WORDS);
}

export function isGeneralRepairServiceIntent(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t) return false;
  if (isVehicleRepairServiceIntent(t) || isMotorcycleRepairServiceIntent(t)) {
    return false;
  }
  return includesAny(t, REPAIR_SERVICE_WORDS);
}

/** Leaf repair category slug when service intent is clear. */
export function detectRepairServiceCategory(text: string): string | null {
  if (isProductDeviceTransaction(text)) return null;
  if (isHomeApplianceProductTransaction(text)) return null;
  if (isMotorcycleProductTransaction(text)) return null;

  if (isVehicleRepairServiceIntent(text)) return 'vehicle-repair';
  if (isMotorcycleRepairServiceIntent(text)) return 'motorcycle-repair';

  const t = normalizeIntakeText(text);
  const repair = hasRepairSignal(text);

  if (t.includes('دوچرخه') && (repair || t.includes('پنچر'))) {
    return 'bicycle-repair';
  }
  if ((t.includes('تردمیل') || t.includes('دستگاه بدنسازی')) && repair) {
    return 'fitness-equipment-repair';
  }
  if ((t.includes('کولر') || t.includes('اسپلیت') || t.includes('گازی')) && repair) {
    return 'ac-repair';
  }
  if ((t.includes('یخچال') || t.includes('فریزر')) && repair) {
    return 'refrigerator-repair';
  }
  if (
    (t.includes('لپ تاپ') || t.includes('لپتاپ') || t.includes('کامپیوتر')) &&
    repair
  ) {
    return 'computer-laptop-repair';
  }
  if (
    (t.includes('موبایل') || t.includes('گوشی') || t.includes('تبلت')) &&
    repair
  ) {
    return 'mobile-tablet-repair';
  }
  if (
    (t.includes('لباسشویی') || t.includes('ظرفشویی')) &&
    repair &&
    !hasBuyIntentPhrase(text) &&
    !hasSellIntent(text)
  ) {
    return 'laundry-dishwasher-repair';
  }
  if (isGeneralRepairServiceIntent(text)) return 'repairs';
  return null;
}
