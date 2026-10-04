import {
  extractPostNaturalFields,
  hasPostDecisionTextEvidence,
} from '@/lib/need-intake/laya/post-natural-extractor';
import { normalizePostNaturalText } from '@/lib/need-intake/laya/post-natural-normalization';
import { getCategoryPath, getDirectChildren } from '@/config/categories';
import { resolvePostNeighborhoodInCity } from '@/lib/need-intake/laya/post-neighborhood-resolver';
import { citySlugToPersianName } from '@/lib/search/city-slugs';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';
import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const main = extractPostNaturalFields(
  'یک محیط حدود ۱۳۵ متری حوالی فردوسی مشهد برای سالن آرایش می‌خوام، اجاره باشه، پارکینگ و آسانسور داشته باشه، تا ۸۰۰ میلیون رهن و ۵۰ میلیون اجاره.'
);

assert(normalizePostNaturalText('ي ۱۲۳ ك') === 'ی 123 ک', 'Persian normalization');
assert(main.entities.area === 135, 'main area');
assert(main.entities.rahnAmount === 800_000_000, 'main deposit');
assert(main.entities.monthlyRent === 50_000_000, 'main monthly rent');
assert(main.entities.budgetMax == null, 'rent amount must not become generic budget');
assert(main.entities.transactionType === 'DEPOSIT_AND_RENT', 'main transaction');
assert(main.neighborhoodPhrase === 'فردوسی', 'main neighborhood phrase');
assert(main.cityCandidate === 'مشهد', 'main city');
assert(
  main.answers.amenities &&
    Array.isArray(main.answers.amenities) &&
    main.answers.amenities.includes('parking') &&
    main.answers.amenities.includes('elevator'),
  'main amenities'
);
assert(main.categoryCandidates.some((candidate) => candidate.slug === 'shop-rent'), 'commercial category candidate');
assert(!main.categoryCandidates.some((candidate) => candidate.slug === 'repairs'), 'no root first-child fallback');

for (const citySlug of [
  'tehran',
  'shiraz',
  'mashhad',
  'ilam-city',
  'najafabad',
  'karaj',
  'isfahan',
  'qom',
] as const) {
  const cityName = citySlugToPersianName(citySlug);
  assert(Boolean(cityName), `known city has a canonical Persian name: ${citySlug}`);
  const parsed = extractPostNaturalFields(`برای اجاره آپارتمان در ${cityName} می‌خواهم`);
  assert(parsed.cityCandidate === cityName, `exact city catalog mention wins: ${citySlug}`);
}

const andishehInsideKaraj = extractPostNaturalFields(
  'برای اجاره آپارتمان در محدودهٔ شهر جدید اندیشه در کرج می‌خواهم'
);
assert(andishehInsideKaraj.cityCandidate === 'کرج', 'the final explicit city outranks a city-like neighborhood phrase');
assert(
  !extractPostNaturalFields('برای اجاره آپارتمان در اندیشه می‌خواهم').cityCandidate,
  'an unindexed city/neighborhood must not be silently reassigned to an inferred major city'
);

assert(
  !hasPostDecisionTextEvidence('usage', 'یک آپارتمان ۱۹۶ متری در ونک می‌خواهم'),
  'property kind and neighborhood alone do not establish intended usage'
);
assert(
  hasPostDecisionTextEvidence('usage', 'یک مغازه برای لوازم آرایشی در فرامرزعباسی می‌خواهم'),
  'an explicit business purpose permits a usage proposal'
);

const parserCategoryRegressions = [
  {
    text: 'برای اجارهٔ کوتاه‌مدت باغ‌ویلایی سه‌خوابه در فرهنگ‌شهر شیراز دنبال گزینه‌ام.',
    category: 'villa-short-rent',
    kind: 'villa',
  },
  {
    text: 'یه سوئیت مبله برای چند شب در مشهد می‌خوام.',
    category: 'suite-apartment-rent',
    kind: undefined,
  },
  {
    text: 'ویلا برای تعطیلات یک هفته‌ای در شیراز اجاره می‌خوام.',
    category: 'villa-short-rent',
    kind: 'villa',
  },
  {
    text: 'فضای کاری برای چند روز در تهران اجاره می‌خوام.',
    category: 'workspace-short-rent',
    kind: undefined,
  },
  {
    text: 'فضای کلاس یا دفتر برای چند روز اجاره می‌خواهم.',
    category: 'workspace-short-rent',
    kind: undefined,
  },
  {
    text: 'برای اجارهٔ ماهانه خانهٔ ویلایی دوخوابه در شاهین‌ویلا کرج دنبال گزینه‌ام.',
    category: 'villa-rent',
    kind: 'villa',
  },
  {
    text: 'برای اجارهٔ کوتاه‌مدت سوئیت‌آپارتمانی یک‌خوابه در برازندهٔ اصفهان دنبال گزینه‌ام.',
    category: 'suite-apartment-rent',
    kind: 'apartment',
  },
  {
    text: 'برای اجارهٔ روزانهٔ پلاتو یا فضای کاری در عباس‌آباد تهران دنبال گزینه‌ام.',
    category: 'workspace-short-rent',
    kind: undefined,
  },
  {
    text: 'در ملارد کرج دنبال اطلاعات و گزینه‌های پیش‌فروش ملک هستم.',
    category: 'pre-sale-services',
    kind: undefined,
  },
  {
    text: 'یه واحد پیش‌خرید در حال ساخت در مشهد می‌خوام.',
    category: 'pre-sale-services',
    kind: undefined,
  },
  {
    text: 'پیش‌خرید نمی‌خوام؛ یک آپارتمان آماده برای خرید در تهران می‌خوام.',
    category: 'apartment-sale',
    kind: 'apartment',
  },
  {
    text: 'برای پروژهٔ ملکی‌ام دنبال سازنده‌ای جهت مشارکت در ساخت می‌گردم.',
    category: 'construction-partnership',
    kind: undefined,
  },
] as const;
for (const item of parserCategoryRegressions) {
  const parsed = extractPostNaturalFields(item.text);
  assert(
    parsed.categoryCandidates.some((candidate) => candidate.slug === item.category),
    `category candidate ${item.category}: ${item.text}`
  );
  assert(
    parsed.categoryCandidates.length === 1,
    `unambiguous service/short-rent intent must not leak sibling categories: ${item.text}`
  );
  assert(
    parsed.categoryCandidates.every((candidate) => {
      const leaf = getCategoryPath(candidate.slug).at(-1);
      return Boolean(leaf && leaf.depth > 0 && getDirectChildren(leaf.slug).length === 0);
    }),
    `only catalog leaf categories may be proposed: ${item.text}`
  );
  if (item.kind) assert(parsed.entities.propertyKind === item.kind, `property kind ${item.kind}: ${item.text}`);
}
const ambiguousRootNeed = extractPostNaturalFields(
  'یک ملک حدود ۱۳۰ متر حوالی ونک می‌خواهم؛ نوع معامله را هنوز نمی‌دانم.'
);
assert(
  ambiguousRootNeed.categoryCandidates.length === 0,
  'an ambiguous real-estate root must remain uncommitted instead of becoming a category leaf'
);
const villaAreaNeed = extractPostNaturalFields('برای خرید زمین در محدودهٔ الهیهٔ تهران دنبال گزینه‌ام.');
assert(villaAreaNeed.neighborhoodPhrase === 'الهیه', 'location label and Persian ezafe are removed from neighborhood value');
const officeRoomsNeed = extractPostNaturalFields('برای خرید دفتر اداری حدود ۷۵ متری و دو اتاقه در سهروردی تهران دنبال گزینه‌ام.');
assert(officeRoomsNeed.entities.rooms === 2, 'room count supports colloquial «دو اتاقه»');
const partnershipNeed = extractPostNaturalFields('برای پروژهٔ ملکی‌ام دنبال سازنده‌ای جهت مشارکت در ساخت می‌گردم.');
assert(!partnershipNeed.neighborhoodPhrase, 'construction wording must not leak into neighborhood');

const verboseLocationWords = Array.from({ length: 143 }, (_, index) => `نام‌مکان${index}`).join(' ');
const verboseListingLikeText = extractPostNaturalFields(
  `برای خرید یک آپارتمان در محدوده ${verboseLocationWords} در تهران می‌خواهم.`
);
assert(
  verboseListingLikeText.entities.propertyKind === 'apartment',
  'an unbounded location capture must not enter the dynamic matcher or hide an explicit property noun'
);

const vanakNeed = extractPostNaturalFields(
  'یک آپارتمان ۱۹۶ متری در ونک می‌خوام ۱۰ میلیارد بودجه دارم'
);
const tehranNeighborhoods = await loadCityNeighborhoods('tehran');
const karajNeighborhoods = await loadCityNeighborhoods('karaj');
const mashhadNeighborhoods = await loadCityNeighborhoods('mashhad');
const ahvazNeighborhoods = await loadCityNeighborhoods('ahvaz');
const shirazNeighborhoods = await loadCityNeighborhoods('shiraz');
const babolNeighborhoods = await loadCityNeighborhoods('babol');
const baharestanNeighborhoods = await loadCityNeighborhoods('baharestan');
const baghershahrNeighborhoods = await loadCityNeighborhoods('baghershahr');
const kuhsarNeighborhoods = await loadCityNeighborhoods('kuhsar-city');
const chaharDangehNeighborhoods = await loadCityNeighborhoods('chahar-dangeh-city');
const booyinNeighborhoods = await loadCityNeighborhoods('booyin-va-miyaandasht');
const fandoghluNeighborhoods = await loadCityNeighborhoods('fandoghlu');
assert(
  resolveTextNeighborhoodInCity(ahvazNeighborhoods, 'مغازه در محدوده پردیس، اهواز می‌خواهم', 'اهواز').hit?.id === 'پردیس',
  'the selected city name must not compete with the actual neighborhood as a second catalog hit'
);
assert(
  !resolveTextNeighborhoodInCity(ahvazNeighborhoods, 'برای خرید آپارتمان در اهواز می‌خواهم', 'اهواز').hit,
  'the selected city itself is never returned as a neighborhood'
);
assert(
  !resolveTextNeighborhoodInCity(
    chaharDangehNeighborhoods,
    'برای اجاره آپارتمان در چهاردانگه (آذربایجان) می‌خواهم',
    'چهاردانگه (آذربایجان)'
  ).hit,
  'a parenthetical city catalog row is context, never a neighborhood hit'
);
assert(
  resolveTextNeighborhoodInCity(
    chaharDangehNeighborhoods,
    'یک واحد در محدودهٔ آبیش احمد در چهاردانگه (آذربایجان) می‌خواهم',
    'چهاردانگه (آذربایجان)'
  ).hit?.id === 'آبیش-احمد',
  'a neighborhood before a parenthetical city is not displaced by the city catalog row'
);
assert(
  resolveTextNeighborhoodInCity(
    booyinNeighborhoods,
    'یک واحد در محدودهٔ بوئین در بوئین و میاندشت می‌خواهم',
    'بوئین و میاندشت'
  ).hit?.id === 'بوئین',
  'a city component repeated as a neighborhood is ignored in the city mention but retained in the location phrase'
);
assert(
  resolveTextNeighborhoodInCity(
    booyinNeighborhoods,
    'برای اجاره حوالی خمسلو، در بوئین و میاندشت ملک می‌خواهم',
    'بوئین و میاندشت'
  ).hit?.id === 'خمسلو',
  'a neighborhood is not overwritten by the trailing «میاندشت» component of the selected city'
);
assert(
  resolveTextNeighborhoodInCity(
    fandoghluNeighborhoods,
    'برای اجاره حوالی رج، در فندقلو ملک می‌خواهم',
    'فندقلو'
  ).hit?.id === 'رج',
  'a generic «ملک می‌خواهم» tail cannot override a location named before the selected city'
);
assert(
  !resolveTextNeighborhoodInCity(
    fandoghluNeighborhoods,
    'برای اجاره آپارتمان در فندقلو ملک می‌خواهم',
    'فندقلو'
  ).hit,
  'the generic tail after a selected city is not auto-applied as a neighborhood'
);
assert(
  !resolveTextNeighborhoodInCity(
    booyinNeighborhoods,
    'برای اجاره در بوئین و میاندشت ملک می‌خواهم',
    'بوئین و میاندشت'
  ).hit,
  'a selected city that is also a catalog row is not silently selected as its own neighborhood'
);
assert(
  resolveTextNeighborhoodInCity(tehranNeighborhoods, 'آپارتمان در محدودهٔ شهرک دانشگاه، تهران می‌خواهم', 'تهران').hit?.id === 'شهرک-دانشگاه',
  'a city suffix in the location context must not outrank an exact district with the same catalog name'
);
assert(
  resolveTextNeighborhoodInCity(shirazNeighborhoods, 'آپارتمان در محدودهٔ جمهوری (شیراز)، شیراز می‌خواهم', 'شیراز').hit?.id === 'جمهوری-شیراز',
  'parenthetical city qualifiers in canonical neighborhood names must remain distinguishable from the following city context'
);
assert(
  resolveTextNeighborhoodInCity(shirazNeighborhoods, 'آپارتمان در محدودهٔ دانشگاه شیراز، شیراز می‌خواهم', 'شیراز').hit?.id === 'دانشگاه-شیراز',
  'city suffixes in official district names must not be mistaken for the separately mentioned city'
);
const joinedMashhadText = 'من یک مغازه میخوام برای لوازم آرایشی محدوده فرامرزعباسی ۱ ملیارد رهن دارم ۲۰۰ میلیون اجاره';
const joinedMashhad = extractPostNaturalFields(joinedMashhadText);
assert(joinedMashhad.neighborhoodPhrase === 'فرامرزعباسی', 'amount after a labeled location must not contaminate its phrase');
assert(
  resolveTextNeighborhoodInCity(mashhadNeighborhoods, joinedMashhadText, 'مشهد').hit?.id === 'شهید-فرامرز-عباسی',
  'joined Persian spelling resolves the selected city catalog row on direct continuation'
);
assert(
  resolvePostNeighborhoodInCity(
    mashhadNeighborhoods,
    joinedMashhad.neighborhoodPhrase ?? '',
    'مشهد',
    joinedMashhadText
  ).hit?.id === 'شهید-فرامرز-عباسی',
  'shared API/form resolver applies the exact neighborhood from a joined colloquial spelling'
);
assert(
  resolveTextNeighborhoodInCity(mashhadNeighborhoods, 'مغازه در فرامرز عباسی مشهد می‌خواهم', 'مشهد').hit?.id === 'شهید-فرامرز-عباسی',
  'honorific-free spelling resolves the same catalog row'
);
for (const [text, label] of [
  ['مغازه در محدودهٔ فرامرز عباسی مشهد می‌خواهم', 'ezafe and separated tokens'],
  ['مغازه در محدوده فرامرزعباسي مشهد می‌خواهم', 'Arabic yeh and joined tokens'],
  ['مغازه حوالی چهارراه فرامرز عباسی می‌خواهم', 'catalog area alias'],
] as const) {
  assert(
    resolvePostNeighborhoodInCity(mashhadNeighborhoods, '', 'مشهد', text).hit?.id === 'شهید-فرامرز-عباسی',
    `${label} resolves to the city-scoped canonical neighborhood`
  );
}
for (const [catalog, text, city, expectedSlug, label] of [
  [ahvazNeighborhoods, 'مغازه در محدوده فرهنگ شهر می‌خواهم', 'اهواز', 'فرهنگ-شهر', 'name ending in شهر'],
  [ahvazNeighborhoods, 'مغازه در محدوده کوی فرهنگیان 1 می‌خواهم', 'اهواز', 'کوی-فرهنگیان-۱', 'Latin digit in numbered neighborhood'],
  [ahvazNeighborhoods, 'مغازه در محدوده زوویه ۲ می‌خواهم', 'اهواز', 'زوویه-۲', 'Persian digit in neighborhood name'],
  [babolNeighborhoods, 'مغازه در محدوده قائم محله می‌خواهم', 'بابل', 'قائم-محله', 'name containing the extractor stop word محله'],
  [baghershahrNeighborhoods, 'مغازه در محدوده هاشم آباد شهر ری می‌خواهم', 'باقرشهر', 'هاشم-آباد-شهر-ری', 'compound name containing شهر'],
  [baharestanNeighborhoods, 'مغازه در محله جی می‌خواهم', 'بهارستان', 'جی', 'unique two-character name under an explicit cue'],
] as const) {
  assert(
    resolveTextNeighborhoodInCity(catalog, text, city).hit?.id === expectedSlug,
    `full-context catalog matching resolves ${label}`
  );
}
assert(
  !resolveTextNeighborhoodInCity(
    baharestanNeighborhoods,
    'قیمت جی برای اجاره مناسب است',
    'بهارستان'
  ).hit,
  'a short neighborhood name without an explicit place cue is never auto-applied'
);
assert(
  resolveTextNeighborhoodInCity(kuhsarNeighborhoods, 'در محدوده امام ۲ مغازه می‌خواهم', 'کوهسار').hit?.id === 'امام-۲',
  'a numbered neighborhood beginning with امام resolves by its full canonical name'
);
assert(
  !resolveTextNeighborhoodInCity(kuhsarNeighborhoods, 'در محدوده ۲ مغازه می‌خواهم', 'کوهسار').hit,
  'an honorific-like prefix is not stripped into a false numeric neighborhood alias'
);
assert(
  !resolveTextNeighborhoodInCity(tehranNeighborhoods, joinedMashhadText, 'تهران').hit,
  'a Mashhad neighborhood must not leak into a different selected city'
);
const vanak = resolvePostNeighborhoodInCity(
  tehranNeighborhoods,
  vanakNeed.neighborhoodPhrase ?? '',
  'تهران',
  'یک آپارتمان ۱۹۶ متری در ونک می‌خوام ۱۰ میلیارد بودجه دارم'
).hit;
assert(vanakNeed.neighborhoodPhrase === 'ونک', 'Vanak phrase extracted when city comes from home context');
assert(!hasPostDecisionTextEvidence('transaction_type', vanakNeed.normalizedText), 'do not suggest an unstated deal type');
assert(!hasPostDecisionTextEvidence('category_candidate', vanakNeed.normalizedText), 'do not infer sale/rent without a transaction cue');
assert(!hasPostDecisionTextEvidence('deed_type', vanakNeed.normalizedText), 'do not suggest an unstated deed type');
assert(!hasPostDecisionTextEvidence('usage', vanakNeed.normalizedText), 'do not guess property usage');
assert(!hasPostDecisionTextEvidence('parking', vanakNeed.normalizedText), 'unmentioned parking stays unknown');
assert(!hasPostDecisionTextEvidence('elevator', vanakNeed.normalizedText), 'unmentioned elevator stays unknown');
assert(!hasPostDecisionTextEvidence('storage', vanakNeed.normalizedText), 'unmentioned storage stays unknown');
assert(hasPostDecisionTextEvidence('transaction_type', 'برای خرید آپارتمان می‌خواهم'), 'explicit deal cue permits a proposal');
assert(hasPostDecisionTextEvidence('parking', 'پارکینگ نمی‌خواهم'), 'explicit negative amenity is evidence');
assert(vanak?.id === 'ونک', 'home-selected Tehran context resolves exact Vanak catalog row');
assert(
  resolveTextNeighborhoodInCity(
    tehranNeighborhoods,
    'یک آپارتمان ۱۹۶ متری در ونک می‌خوام ۱۰ میلیارد بودجه دارم',
    'تهران'
  ).hit?.id === 'ونک',
  'direct form continuation resolves Vanak without triggering Laya'
);
assert(
  resolveTextNeighborhoodInCity(
    tehranNeighborhoods,
    'یک آپارتمان در نیاوران مدنظرم هست',
    'تهران'
  ).hit?.name === 'نیاوران',
  'direct continuation resolves a neighborhood before مدنظرم'
);
assert(
  !resolveTextNeighborhoodInCity(tehranNeighborhoods, 'یک آپارتمان ۱۹۶ متری می‌خواهم', 'تهران').hit,
  'unmentioned neighborhood stays empty'
);
assert(
  !resolveTextNeighborhoodInCity(
    mashhadNeighborhoods,
    'در ونک آپارتمان می‌خواهم',
    'مشهد'
  ).hit,
  'a neighborhood outside the selected city is not applied'
);
const ambiguousHood = resolveTextNeighborhoodInCity(
  mashhadNeighborhoods,
  'آپارتمان در بنفشه مشهد می‌خواهم',
  'مشهد'
);
assert(!ambiguousHood.hit && ambiguousHood.candidates.length >= 2, 'shared area stays ambiguous');
assert(
  resolveTextNeighborhoodInCity(
    mashhadNeighborhoods,
    'آپارتمان ۱۳۵ متری فردوسی مشهد برای اجاره می‌خواهم',
    'مشهد'
  ).hit?.name === 'فردوسی',
  'bare neighborhood before the selected city resolves to its exact catalog name'
);
assert(
  resolvePostNeighborhoodInCity(
    mashhadNeighborhoods,
    'حاشیه فردوسی بین ثمانه و مهدی',
    'مشهد',
    'یک واحد برای مزون میخوام حاشیه فردوسی بین ثمانه و مهدی حداکثر ۱۰۰ میلیون اجاره'
  ).hit?.id === 'فردوسی',
  'compound location phrasing resolves its explicit neighborhood anchor in the selected city'
);
assert(
  resolvePostNeighborhoodInCity(
    mashhadNeighborhoods,
    'فامرزعباسی',
    'مشهد',
    'مغازه در محدوده فامرزعباسی می‌خواهم'
  ).hit?.id === 'شهید-فرامرز-عباسی',
  'a single-character typo can resolve only against an explicit, selected-city location phrase'
);
const twoEditNearMiss = resolvePostNeighborhoodInCity(
  mashhadNeighborhoods,
  'چهارراه فرامرز عابسی',
  'مشهد',
  'مغازه در محدوده چهارراه فرامرز عابسی می‌خواهم'
);
assert(!twoEditNearMiss.hit, 'a two-edit miss must never silently auto-apply');
assert(
  twoEditNearMiss.candidates.some((candidate) => candidate.id === 'شهید-فرامرز-عباسی'),
  'a close two-edit miss is surfaced as a review-only neighborhood candidate'
);
assert(
  !resolvePostNeighborhoodInCity(
    mashhadNeighborhoods,
    'فرامرزعباسی',
    'مشهد',
    'مغازه لوازم آرایشی فرامرزعباسی حدود ۷۰ متر'
  ).hit,
  'a place-like token without a location cue is not auto-applied'
);
assert(
  !resolvePostNeighborhoodInCity(
    tehranNeighborhoods,
    joinedMashhad.neighborhoodPhrase ?? '',
    'تهران',
    joinedMashhadText
  ).hit,
  'shared API/form resolver never leaks a Mashhad neighborhood into Tehran'
);
assert(
  !resolvePostNeighborhoodInCity(
    tehranNeighborhoods,
    'فرامرزعباسی',
    'تهران',
    'مغازه در محدوده فرامرزعباسی می‌خواهم'
  ).hit,
  'a partial alias such as «عباسی» must not turn a Mashhad place into an unrelated Tehran hit'
);
assert(
  vanak?.centroid?.lat === 35.7607574 && vanak.centroid.lng === 51.4050674,
  'Vanak coordinates are used for neighborhood map framing'
);

const negative = extractPostNaturalFields('دفتر ۹۰ متری در تبریز می‌خواهم، پارکینگ نمی‌خواهم.');
assert(
  negative.fields.some((field) => field.key === 'parking' && field.value === 'no' && field.requiresConfirmation),
  'negative amenity remains a confirmation proposal'
);

const range = extractPostNaturalFields('آپارتمان بین ۱۲۰ تا ۱۵۰ متر در تهران برای خرید.');
assert(range.fields.some((field) => field.key === 'areaRange' && field.requiresConfirmation), 'area range confirmation');
assert(range.entities.area == null, 'range does not collapse to one area');

const shahinvillaText = 'برای اجارهٔ خانهٔ ویلایی حدود ۱۳۵ متر و دوخوابه در شاهین‌ویلای کرج دنبال گزینه‌ام.';
const shahinvillaNeed = extractPostNaturalFields(shahinvillaText);
assert(
  resolvePostNeighborhoodInCity(
    karajNeighborhoods,
    shahinvillaNeed.neighborhoodPhrase ?? '',
    'کرج',
    shahinvillaText
  ).hit?.id === 'شاهینویلا',
  'Persian ezafe on a compound neighborhood name resolves against the selected city catalog'
);

const apartmentInShahinVilla = extractPostNaturalFields(
  'یک آپارتمان ۱۳۰ متری در محدودهٔ شاهین ویلا، کرج برای خرید می‌خواهم.'
);
assert(
  apartmentInShahinVilla.entities.propertyKind === 'apartment' &&
    apartmentInShahinVilla.categoryCandidates.some((candidate) => candidate.slug === 'apartment-sale') &&
    !apartmentInShahinVilla.categoryCandidates.some((candidate) => candidate.slug === 'villa-sale'),
  'a neighborhood containing «ویلا» must not override an explicit apartment kind'
);

const villaInShahinVilla = extractPostNaturalFields(
  'برای اجارهٔ ویلا در محدودهٔ شاهین ویلا، کرج گزینه می‌خواهم.'
);
assert(
  villaInShahinVilla.entities.propertyKind === 'villa' &&
    villaInShahinVilla.categoryCandidates.some((candidate) => candidate.slug === 'villa-rent'),
  'masking a neighborhood keyword must preserve an explicit villa property kind'
);

const apartmentInTehranVilla = extractPostNaturalFields(
  'نیاز به آپارتمان حدود ۷۰ متر ۲ خواب در محدودهٔ تهران‌ویلا، تهران دارم؛ قصد خرید دارم.'
);
assert(
  apartmentInTehranVilla.neighborhoodPhrase === 'تهران ویلا' &&
    resolvePostNeighborhoodInCity(
      tehranNeighborhoods,
      apartmentInTehranVilla.neighborhoodPhrase,
      'تهران',
      'نیاز به آپارتمان در محدودهٔ تهران‌ویلا، تهران دارم.'
    ).hit?.id === 'تهرانویلا' &&
    apartmentInTehranVilla.entities.propertyKind === 'apartment' &&
    apartmentInTehranVilla.categoryCandidates.some((candidate) => candidate.slug === 'apartment-sale') &&
    !apartmentInTehranVilla.categoryCandidates.some((candidate) => candidate.slug === 'villa-sale'),
  'a compound neighborhood beginning with a catalog city name resolves in that city without overriding explicit apartment kind'
);

const shopWithStorage = extractPostNaturalFields('برای اجارهٔ ماهانه یک مغازه با انباری در تهران می‌خواهم.');
assert(
  shopWithStorage.entities.propertyKind === 'shop' &&
    shopWithStorage.categoryCandidates.some((candidate) => candidate.slug === 'shop-rent') &&
    !shopWithStorage.categoryCandidates.some((candidate) => candidate.slug === 'industrial-rent'),
  'the amenity «انباری» must not turn a shop into an industrial warehouse'
);

console.log('post natural rules self-test: ok');
