import {
  getBusinessCommercialPropertyCandidates,
  isAmbiguousCommercialSubtype,
  isBeautyServiceOnlyIntent,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';
import { parseIntentFromText, suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import { findMegaMenuCategoryForSlug, getMegaMenuBreadcrumb } from '@/lib/need-intake/mega-menu-category-utils';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const SALON_RENT =
  '\u0645\u0646 \u06CC\u06A9 \u0633\u0627\u0644\u0646 \u0622\u0631\u0627\u06CC\u0634 \u062F\u0631 \u0646\u0627\u0631\u0645\u06A9 \u0645\u06CC\u062E\u0648\u0627\u0645 \u0628\u0632\u0646\u0645 \u0644\u0637\u0641\u0627 \u0627\u06AF\u0631 \u062F\u0631 \u0627\u0648\u0646 \u0645\u0646\u0637\u0642\u0647 \u0645\u0648\u0631\u062F \u0645\u0646\u0627\u0633\u0628 \u0628\u0627 \u06F1\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u0648 \u06F1\u06F0 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u062F\u0627\u0631\u06CC\u062F \u0645\u0639\u0631\u0641\u06CC \u06A9\u0646\u06CC\u062F';

assert(isBusinessCommercialPropertyIntent(SALON_RENT), 'salon rent is business commercial intent');
assert(isAmbiguousCommercialSubtype(SALON_RENT), 'salon rent is ambiguous commercial');
const salonCandidates = getBusinessCommercialPropertyCandidates(SALON_RENT);
assert(salonCandidates.includes('shop-rent'), `salon candidates: ${salonCandidates.join(',')}`);
assert(salonCandidates.includes('office-rent'), `salon candidates: ${salonCandidates.join(',')}`);

const parsedSalon = parseIntentFromText(SALON_RENT);
assert(
  parsedSalon.categorySlug !== 'beauty-health' && parsedSalon.categorySlug !== 'apartment-rent',
  `parsed salon category: ${parsedSalon.categorySlug}`
);
assert(!parsedSalon.subcategorySlug?.trim(), 'salon should not auto-fill subcategory');

const salonSuggestions = suggestNeedCategoriesFromText(SALON_RENT, 6).map((c) => c.slug);
assert(salonSuggestions.includes('shop-rent'), `suggestions: ${salonSuggestions.join(',')}`);
assert(salonSuggestions.includes('office-rent'), `suggestions: ${salonSuggestions.join(',')}`);
assert(!salonSuggestions.includes('beauty-health'), 'beauty-health excluded from salon suggestions');

const BEAUTY_SERVICE = '\u0622\u0631\u0627\u06CC\u0634\u06AF\u0631 \u0639\u0631\u0648\u0633 \u062F\u0631 \u062A\u0647\u0631\u0627\u0646';
assert(isBeautyServiceOnlyIntent(BEAUTY_SERVICE), 'beauty service only');
assert(!isBusinessCommercialPropertyIntent(BEAUTY_SERVICE), 'not commercial property');
const parsedBeauty = parseIntentFromText(BEAUTY_SERVICE);
assert(
  parsedBeauty.categorySlug === 'beauty-health' ||
    parsedBeauty.subcategorySlug === 'beauty-health' ||
    suggestNeedCategoriesFromText(BEAUTY_SERVICE, 3).some((c) => c.slug === 'beauty-health'),
  `beauty category: ${parsedBeauty.categorySlug}`
);

const MEZON = '\u0645\u0632\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u062F\u0631 \u0648\u0646\u06A9';
assert(isBusinessCommercialPropertyIntent(MEZON), 'mezon rent intent');
const mezonCandidates = getBusinessCommercialPropertyCandidates(MEZON);
assert(mezonCandidates.includes('shop-rent'), `mezon: ${mezonCandidates.join(',')}`);
assert(mezonCandidates.length === 1, 'explicit mezon premises is shop, not generic office');

const REPORTED_MEZON = 'یک واحد برای مزون میخوام حاشیه فردوسی بین ثمانه و مهدی حداکثر ۱۰۰ میلیون اجاره سیصد میلیون رهن میخوام قرارداد ۲ ساله بنویسم';
const resolvedMezon = resolveIntakeCategory({ sourceText: REPORTED_MEZON, formCategorySlug: 'services' });
assert(
  resolvedMezon.categorySlug === 'commercial-rent' && resolvedMezon.subcategorySlug === 'shop-rent',
  'a root services URL hint must yield to explicit commercial property rent evidence'
);
const mezonMenuCategory = findMegaMenuCategoryForSlug('shop-rent');
assert(
  mezonMenuCategory?.id === 'shop-rent' &&
    getMegaMenuBreadcrumb(mezonMenuCategory).includes('مغازه و غرفه'),
  'the selected leaf must be visible in the category picker label'
);
const resolvedSalon = resolveIntakeCategory({ sourceText: SALON_RENT, formCategorySlug: 'services' });
assert(
  resolvedSalon.categorySlug === 'commercial-rent' && !resolvedSalon.subcategorySlug,
  'an ambiguous salon stays in the commercial rent branch without guessing a leaf'
);
const lockedServices = resolveIntakeCategory({
  sourceText: REPORTED_MEZON,
  formCategorySlug: 'services',
  categoryLockedByUser: true,
});
assert(lockedServices.categorySlug === 'services', 'an explicit user category choice remains locked');
const unknownDeal = getBusinessCommercialPropertyCandidates('یک واحد برای مزون می‌خواهم');
assert(
  unknownDeal.includes('shop-rent') && unknownDeal.includes('shop-sale'),
  'a commercial property without a deal cue must not silently assume rent'
);

const SHOP = '\u0645\u063A\u0627\u0632\u0647 \u0627\u062C\u0627\u0631\u0647 \u0646\u0627\u0631\u0645\u06A9';
assert(isBusinessCommercialPropertyIntent(SHOP), 'shop rent intent');
assert(!isAmbiguousCommercialSubtype(SHOP), 'explicit shop is not ambiguous');
assert(getBusinessCommercialPropertyCandidates(SHOP).join(',') === 'shop-rent', 'shop only');

const SHOP_WITH_STORAGE = 'برای اجارهٔ ماهانه یک مغازه با انباری می‌خواهم.';
assert(
  getBusinessCommercialPropertyCandidates(SHOP_WITH_STORAGE).join(',') === 'shop-rent',
  'an apartment/shop storage feature «انباری» must not be mistaken for an industrial warehouse «انبار»'
);
assert(
  parseIntentFromText(SHOP_WITH_STORAGE).categorySlug === 'commercial-rent' &&
    parseIntentFromText(SHOP_WITH_STORAGE).subcategorySlug === 'shop-rent',
  'legacy parser keeps a shop with storage out of industrial categories'
);
assert(
  getBusinessCommercialPropertyCandidates('برای کسب و کارم انبار صنعتی برای اجاره می‌خواهم.').join(',') === 'industrial-rent',
  'an explicit warehouse remains industrial'
);

const BIZ_APT = 'آپارتمان اجاره برای کسب و کار در ونک';
assert(isBusinessCommercialPropertyIntent(BIZ_APT), 'apartment+business is commercial');
assert(
  !getBusinessCommercialPropertyCandidates(BIZ_APT).includes('apartment-rent'),
  'must not suggest apartment-rent'
);
const parsedBizApt = parseIntentFromText(BIZ_APT);
assert(
  parsedBizApt.categorySlug !== 'apartment-rent' &&
    parsedBizApt.subcategorySlug !== 'apartment-rent',
  `biz apt must not be residential: ${parsedBizApt.categorySlug}/${parsedBizApt.subcategorySlug}`
);

const BIZ_UNIT = 'میخوام یه واحد برای کسب و کارم اجاره کنم مشهد';
assert(isBusinessCommercialPropertyIntent(BIZ_UNIT), 'unit for business is commercial');

console.log('business-commercial-property-intent self-test OK');
