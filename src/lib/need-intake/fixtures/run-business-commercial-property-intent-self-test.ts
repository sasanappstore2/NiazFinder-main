import {
  getBusinessCommercialPropertyCandidates,
  isAmbiguousCommercialSubtype,
  isBeautyServiceOnlyIntent,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';
import { parseIntentFromText, suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';

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

const SHOP = '\u0645\u063A\u0627\u0632\u0647 \u0627\u062C\u0627\u0631\u0647 \u0646\u0627\u0631\u0645\u06A9';
assert(isBusinessCommercialPropertyIntent(SHOP), 'shop rent intent');
assert(!isAmbiguousCommercialSubtype(SHOP), 'explicit shop is not ambiguous');
assert(getBusinessCommercialPropertyCandidates(SHOP).join(',') === 'shop-rent', 'shop only');

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
