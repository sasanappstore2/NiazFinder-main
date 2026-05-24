/**
 * Canonical location registry.
 *
 * Rules (locked, per architecture spec):
 * - All city/province slugs are short, English, language-independent.
 *   GOOD: "tehran", "mashhad", "istanbul"
 *   BAD : "تهران", "مشهد"
 * - URLs encode the location FIRST (Divar-style):
 *     /s/{location}                           — country (`iran`) or canonical city
 *     /s/{location}/{category}                — + category
 *     /s/{location}/{parent}/{category}       — + nested category
 * - Multi-city / multi-province / international scopes ALWAYS use query params:
 *     ?cities=tehran,mashhad
 *     ?provinces=tehran,alborz
 */

/** Reserved pseudo-slug meaning "all of Iran". Never collides with a city slug. */
export const COUNTRY_SLUG = 'iran' as const;
export type CountrySlug = typeof COUNTRY_SLUG;

export interface CanonicalProvince {
  slug: string;
  title: string;
  englishTitle: string;
  countryCode: string;
}

export interface CanonicalCity {
  slug: string;
  title: string;
  englishTitle: string;
  provinceSlug: string;
}

// Iran provinces (subset; extend as registry grows). English slugs, ISO style.
export const CANONICAL_PROVINCES: readonly CanonicalProvince[] = [
  { slug: 'tehran',         title: 'تهران',         englishTitle: 'Tehran',         countryCode: 'IR' },
  { slug: 'alborz',         title: 'البرز',         englishTitle: 'Alborz',         countryCode: 'IR' },
  { slug: 'isfahan',        title: 'اصفهان',        englishTitle: 'Isfahan',        countryCode: 'IR' },
  { slug: 'fars',           title: 'فارس',          englishTitle: 'Fars',           countryCode: 'IR' },
  { slug: 'east-azerbaijan',title: 'آذربایجان شرقی',englishTitle: 'East Azerbaijan',countryCode: 'IR' },
  { slug: 'west-azerbaijan',title: 'آذربایجان غربی',englishTitle: 'West Azerbaijan',countryCode: 'IR' },
  { slug: 'razavi-khorasan',title: 'خراسان رضوی',   englishTitle: 'Razavi Khorasan',countryCode: 'IR' },
  { slug: 'khuzestan',      title: 'خوزستان',       englishTitle: 'Khuzestan',      countryCode: 'IR' },
  { slug: 'qom',            title: 'قم',            englishTitle: 'Qom',            countryCode: 'IR' },
  { slug: 'gilan',          title: 'گیلان',         englishTitle: 'Gilan',          countryCode: 'IR' },
  { slug: 'mazandaran',     title: 'مازندران',      englishTitle: 'Mazandaran',     countryCode: 'IR' },
  { slug: 'kerman',         title: 'کرمان',         englishTitle: 'Kerman',         countryCode: 'IR' },
  { slug: 'kermanshah',     title: 'کرمانشاه',      englishTitle: 'Kermanshah',     countryCode: 'IR' },
  { slug: 'sistan-baluchestan',title: 'سیستان و بلوچستان',englishTitle: 'Sistan and Baluchestan',countryCode: 'IR' },
  { slug: 'hormozgan',      title: 'هرمزگان',       englishTitle: 'Hormozgan',      countryCode: 'IR' },
  { slug: 'kurdistan',      title: 'کردستان',       englishTitle: 'Kurdistan',      countryCode: 'IR' },
  { slug: 'qazvin',         title: 'قزوین',         englishTitle: 'Qazvin',         countryCode: 'IR' },
  { slug: 'zanjan',         title: 'زنجان',         englishTitle: 'Zanjan',         countryCode: 'IR' },
  { slug: 'golestan',       title: 'گلستان',        englishTitle: 'Golestan',       countryCode: 'IR' },
  { slug: 'ardabil',        title: 'اردبیل',        englishTitle: 'Ardabil',        countryCode: 'IR' },
  { slug: 'hamadan',        title: 'همدان',         englishTitle: 'Hamadan',        countryCode: 'IR' },
  { slug: 'lorestan',       title: 'لرستان',        englishTitle: 'Lorestan',       countryCode: 'IR' },
  { slug: 'yazd',           title: 'یزد',           englishTitle: 'Yazd',           countryCode: 'IR' },
  { slug: 'markazi',        title: 'مرکزی',         englishTitle: 'Markazi',        countryCode: 'IR' },
  { slug: 'semnan',         title: 'سمنان',         englishTitle: 'Semnan',         countryCode: 'IR' },
  { slug: 'bushehr',        title: 'بوشهر',         englishTitle: 'Bushehr',        countryCode: 'IR' },
  { slug: 'chaharmahal-bakhtiari',title: 'چهارمحال و بختیاری',englishTitle: 'Chaharmahal and Bakhtiari',countryCode: 'IR' },
  { slug: 'kohgiluyeh-boyer-ahmad',title: 'کهگیلویه و بویراحمد',englishTitle: 'Kohgiluyeh and Boyer-Ahmad',countryCode: 'IR' },
  { slug: 'ilam',           title: 'ایلام',         englishTitle: 'Ilam',           countryCode: 'IR' },
  { slug: 'north-khorasan', title: 'خراسان شمالی',  englishTitle: 'North Khorasan', countryCode: 'IR' },
  { slug: 'south-khorasan', title: 'خراسان جنوبی',  englishTitle: 'South Khorasan', countryCode: 'IR' },
] as const;

// Major Iranian cities (canonical SEO landing list).
export const CANONICAL_CITIES: readonly CanonicalCity[] = [
  { slug: 'tehran',     title: 'تهران',     englishTitle: 'Tehran',     provinceSlug: 'tehran' },
  { slug: 'karaj',      title: 'کرج',       englishTitle: 'Karaj',      provinceSlug: 'alborz' },
  { slug: 'isfahan',    title: 'اصفهان',    englishTitle: 'Isfahan',    provinceSlug: 'isfahan' },
  { slug: 'shiraz',     title: 'شیراز',     englishTitle: 'Shiraz',     provinceSlug: 'fars' },
  { slug: 'tabriz',     title: 'تبریز',     englishTitle: 'Tabriz',     provinceSlug: 'east-azerbaijan' },
  { slug: 'urmia',      title: 'ارومیه',    englishTitle: 'Urmia',      provinceSlug: 'west-azerbaijan' },
  { slug: 'mashhad',    title: 'مشهد',      englishTitle: 'Mashhad',    provinceSlug: 'razavi-khorasan' },
  { slug: 'ahvaz',      title: 'اهواز',     englishTitle: 'Ahvaz',      provinceSlug: 'khuzestan' },
  { slug: 'qom',        title: 'قم',        englishTitle: 'Qom',        provinceSlug: 'qom' },
  { slug: 'rasht',      title: 'رشت',       englishTitle: 'Rasht',      provinceSlug: 'gilan' },
  { slug: 'sari',       title: 'ساری',      englishTitle: 'Sari',       provinceSlug: 'mazandaran' },
  { slug: 'kerman',     title: 'کرمان',     englishTitle: 'Kerman',     provinceSlug: 'kerman' },
  { slug: 'kermanshah', title: 'کرمانشاه',  englishTitle: 'Kermanshah', provinceSlug: 'kermanshah' },
  { slug: 'zahedan',    title: 'زاهدان',    englishTitle: 'Zahedan',    provinceSlug: 'sistan-baluchestan' },
  { slug: 'bandar-abbas',title: 'بندرعباس', englishTitle: 'Bandar Abbas',provinceSlug: 'hormozgan' },
  { slug: 'sanandaj',   title: 'سنندج',     englishTitle: 'Sanandaj',   provinceSlug: 'kurdistan' },
  { slug: 'qazvin',     title: 'قزوین',     englishTitle: 'Qazvin',     provinceSlug: 'qazvin' },
  { slug: 'zanjan',     title: 'زنجان',     englishTitle: 'Zanjan',     provinceSlug: 'zanjan' },
  { slug: 'gorgan',     title: 'گرگان',     englishTitle: 'Gorgan',     provinceSlug: 'golestan' },
  { slug: 'ardabil',    title: 'اردبیل',    englishTitle: 'Ardabil',    provinceSlug: 'ardabil' },
  { slug: 'hamadan',    title: 'همدان',     englishTitle: 'Hamadan',    provinceSlug: 'hamadan' },
  { slug: 'yazd',       title: 'یزد',       englishTitle: 'Yazd',       provinceSlug: 'yazd' },
  { slug: 'arak',       title: 'اراک',      englishTitle: 'Arak',       provinceSlug: 'markazi' },
  { slug: 'bushehr',    title: 'بوشهر',     englishTitle: 'Bushehr',    provinceSlug: 'bushehr' },
  { slug: 'bojnourd',   title: 'بجنورد',    englishTitle: 'Bojnourd',   provinceSlug: 'north-khorasan' },
] as const;

const CITY_BY_SLUG: ReadonlyMap<string, CanonicalCity> = new Map(
  CANONICAL_CITIES.map((c) => [c.slug, c])
);
const PROVINCE_BY_SLUG: ReadonlyMap<string, CanonicalProvince> = new Map(
  CANONICAL_PROVINCES.map((p) => [p.slug, p])
);
const CITY_SLUGS: ReadonlySet<string> = new Set(CANONICAL_CITIES.map((c) => c.slug));
const PROVINCE_SLUGS: ReadonlySet<string> = new Set(CANONICAL_PROVINCES.map((p) => p.slug));

export function isCitySlug(slug: string): boolean {
  return CITY_SLUGS.has(slug);
}

export function isProvinceSlug(slug: string): boolean {
  return PROVINCE_SLUGS.has(slug);
}

export function getCityBySlug(slug: string): CanonicalCity | null {
  return CITY_BY_SLUG.get(slug) ?? null;
}

export function getProvinceBySlug(slug: string): CanonicalProvince | null {
  return PROVINCE_BY_SLUG.get(slug) ?? null;
}

/** A "location" is either the country pseudo-slug `iran` or a canonical city. */
export function isLocationSlug(slug: string): boolean {
  return slug === COUNTRY_SLUG || CITY_SLUGS.has(slug);
}

/** Country-wide is treated as the implicit default location. */
export function isCountryLocation(slug: string): boolean {
  return slug === COUNTRY_SLUG;
}

/** All canonical city slugs (stable order). */
export function getAllCitySlugs(): readonly string[] {
  return CANONICAL_CITIES.map((c) => c.slug);
}

/**
 * All city slugs except the given ones — mirrors Divar's long `?cities=` lists
 * used for "all cities except X" scopes.
 *
 * Example: getCitySlugsExcept('mashhad') → every city except mashhad.
 */
export function getCitySlugsExcept(...exclude: string[]): string[] {
  const excluded = new Set(exclude.map((s) => s.toLowerCase()));
  return CANONICAL_CITIES.filter((c) => !excluded.has(c.slug)).map((c) => c.slug);
}
