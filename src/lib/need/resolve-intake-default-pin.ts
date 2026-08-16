import { isInIranLatLng } from '@/lib/map/coords';

/** Well-known Iran city centers — no geo JSON required (gitignored on some machines). */
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  تهران: { lat: 35.6892, lng: 51.389 },
  مشهد: { lat: 36.2972, lng: 59.6067 },
  اصفهان: { lat: 32.6546, lng: 51.668 },
  شیراز: { lat: 29.5918, lng: 52.5837 },
  تبریز: { lat: 38.08, lng: 46.2919 },
  کرج: { lat: 35.8403, lng: 50.9391 },
  اهواز: { lat: 31.3183, lng: 48.6706 },
  قم: { lat: 34.6416, lng: 50.8746 },
  کرمانشاه: { lat: 34.3142, lng: 47.065 },
  ارومیه: { lat: 37.5527, lng: 45.0761 },
  رشت: { lat: 37.2808, lng: 49.5832 },
  زاهدان: { lat: 29.4963, lng: 60.8629 },
  همدان: { lat: 34.7992, lng: 48.5146 },
  کرمان: { lat: 30.2832, lng: 57.0788 },
  یزد: { lat: 31.8974, lng: 54.3569 },
  اردبیل: { lat: 38.2498, lng: 48.2933 },
  بندرعباس: { lat: 27.1832, lng: 56.2666 },
  اراک: { lat: 34.0954, lng: 49.6919 },
  ساری: { lat: 36.5633, lng: 53.0601 },
  قزوین: { lat: 36.2688, lng: 50.0041 },
  زنجان: { lat: 36.6736, lng: 48.4787 },
  سنندج: { lat: 35.3119, lng: 46.9963 },
  گرگان: { lat: 36.8456, lng: 54.4393 },
  بوشهر: { lat: 28.9234, lng: 50.8203 },
  کاشان: { lat: 33.985, lng: 51.41 },
  نیشابور: { lat: 36.214, lng: 58.7961 },
  سبزوار: { lat: 36.2126, lng: 57.6819 },
};

const IRAN_FALLBACK = { lat: 32.4279, lng: 53.688 };

function hash32(input: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

function jitter(base: { lat: number; lng: number }, seed: string): { lat: number; lng: number } {
  const h = hash32(seed);
  const lat = base.lat + (((h % 200) - 100) / 100) * 0.012;
  const lng = base.lng + ((((h >> 8) % 200) - 100) / 100) * 0.014;
  return { lat, lng };
}

function cityCenter(cityName?: string | null): { lat: number; lng: number } | null {
  const name = cityName?.trim();
  if (!name) return null;
  if (CITY_CENTERS[name]) return CITY_CENTERS[name]!;
  const stripped = name.replace(/\s*\(.+\)\s*$/, '').trim();
  return CITY_CENTERS[stripped] ?? null;
}

/** Best-effort Iran pin from city / neighborhood so publish mapPin is never empty. */
export function resolveIntakeDefaultPin(opts: {
  cityName?: string | null;
  citySlug?: string | null;
  neighborhoodName?: string | null;
  neighborhoodSlug?: string | null;
  seed?: string;
}): { lat: number; lng: number } | null {
  const seed =
    opts.seed?.trim() ||
    opts.neighborhoodSlug?.trim() ||
    opts.neighborhoodName?.trim() ||
    opts.cityName?.trim() ||
    opts.citySlug?.trim() ||
    'intake';

  const base = cityCenter(opts.cityName) ?? IRAN_FALLBACK;
  const pin = jitter(base, `${opts.cityName ?? ''}:${opts.neighborhoodName ?? ''}:${seed}`);
  if (isInIranLatLng(pin.lat, pin.lng)) return pin;
  if (isInIranLatLng(base.lat, base.lng)) return base;
  return null;
}
