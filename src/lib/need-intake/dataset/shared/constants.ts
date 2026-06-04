export const SYNTH_CITIES = [
  'تهران',
  'مشهد',
  'اصفهان',
  'شیراز',
  'کرج',
  'تبریز',
  'اهواز',
  'قم',
  'رشت',
  'یزد',
  'کرمان',
  'همدان',
] as const;

export const SYNTH_DISTRICTS: Partial<Record<(typeof SYNTH_CITIES)[number], string[]>> = {
  تهران: ['ولنجک', 'یوسف‌آباد', 'سعادت‌آباد', 'پونک', 'نیاوران', 'تهرانپارس', 'ونک', 'غرب تهران'],
  مشهد: ['احمدآباد', 'سجاد', 'هاشمیه', 'فرامرز عباسی'],
  اصفهان: ['مرداویج', 'چهارباغ', 'خانه اصفهان'],
  شیراز: ['معالی‌آباد', 'صدرا', 'قصردشت'],
  کرج: ['گوهردشت', 'مهرویلا', 'عظیمیه'],
};

export const SYNTH_BUDGETS = ['۵', '۱۰', '۱۵', '۲۰', '۳۰', '۵۰', '۸۰', '۱۰۰', '۱۵۰', '۲۰۰', '۳۰۰', '۵۰۰'];
export const SYNTH_BUDGETS_BILLION = ['۰.۵', '۱', '۱.۵', '۲', '۲.۵', '۳', '۴', '۵', '۷', '۱۰'];
export const SYNTH_AREAS = ['55', '70', '85', '90', '100', '120', '150', '180', '200', '250', '300'];
export const SYNTH_ROOMS = ['۱', '۲', '۳', '۴'];

export function districtFor(city: (typeof SYNTH_CITIES)[number], variant: number): string {
  const list = SYNTH_DISTRICTS[city];
  if (!list?.length) return city;
  return `${list[variant % list.length]} ${city}`;
}

export function pickCity(variant: number): (typeof SYNTH_CITIES)[number] {
  return SYNTH_CITIES[variant % SYNTH_CITIES.length];
}
