import { CANONICAL_CITIES } from '@/config/locations';

export const SYNTH_CITIES = CANONICAL_CITIES.map((c) => c.title) as readonly string[];
export type SynthCity = (typeof SYNTH_CITIES)[number];

export const SYNTH_DISTRICTS: Partial<Record<SynthCity, string[]>> = {
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

export function districtFor(city: SynthCity, variant: number): string {
  const list = SYNTH_DISTRICTS[city];
  if (!list?.length) return city;
  return `${list[variant % list.length]} ${city}`;
}

export function pickCity(variant: number): SynthCity {
  return SYNTH_CITIES[variant % SYNTH_CITIES.length];
}
