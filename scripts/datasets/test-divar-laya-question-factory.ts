import {
  buildDivarLayaBatchQuestions,
  buildDivarOfferInspectionQuestions,
  buildDivarLayaQuestionsForText,
} from './divar-laya-question-factory';
import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';
import { buildPostDecisionQuestions } from '@/lib/need-intake/laya/post-decision-questions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const questions = buildDivarLayaBatchQuestions();
const offerQuestions = buildDivarOfferInspectionQuestions();
const categoryCriteria = questions.category_candidate?.type === 'choice'
  ? questions.category_candidate.criteria
  : {};
const expectedLeaves = CANONICAL_CATEGORIES.filter(
  (category) => category.depth === 2 && getCategoryPath(category.slug)[0]?.slug === 'real-estate',
);

assert(expectedLeaves.length >= 2, 'The app must expose multiple real-estate leaf categories.');
assert(Object.keys(categoryCriteria).length === expectedLeaves.length + 1, 'All property leaves plus unknown are choices.');
assert(expectedLeaves.every((category) => categoryCriteria[category.slug]), 'Every app property leaf must be available.');
assert(expectedLeaves.every((category) => categoryCriteria[category.slug]!.length >= 18), 'Every leaf must retain concise Persian semantics, not a bare path label.');
assert(expectedLeaves.every((category) => !categoryCriteria[category.slug]!.startsWith('مسیر ')), 'Every canonical leaf must have an explicit semantic description.');
assert(categoryCriteria.unknown, 'The category question must preserve an unknown option.');
assert(!categoryCriteria.services && !categoryCriteria['real-estate'], 'Root categories must not be offered as leaves.');
assert(categoryCriteria['apartment-sale'] !== categoryCriteria['apartment-rent'], 'Same-label apartment leaves must be semantically distinct.');
assert(categoryCriteria['apartment-sale']?.includes('خرید') && categoryCriteria['apartment-rent']?.includes('اجاره'), 'Apartment criteria must distinguish transaction intent.');
assert(categoryCriteria['villa-short-rent']?.includes('کوتاه‌مدت') && categoryCriteria['villa-rent']?.includes('بلندمدت'), 'Villa criteria must distinguish trip stays from ordinary rental.');
assert(categoryCriteria['shop-rent']?.includes('مغازه') && categoryCriteria['office-rent']?.includes('دفتر'), 'Commercial leaves must carry their own lexical cues.');
assert(categoryCriteria.unknown?.includes('محله') && categoryCriteria.unknown?.includes('حدس نزن'), 'Unknown must avoid inferring a category from location-only evidence.');
const productionQuestions = buildPostDecisionQuestions({
  categoryCandidates: [
    { slug: 'apartment-sale', label: 'خرید آپارتمان' },
    { slug: 'apartment-rent', label: 'اجاره آپارتمان' },
  ],
});
assert(
  productionQuestions.category_candidate?.type === 'choice' &&
    productionQuestions.category_candidate.criteria['apartment-sale'] === categoryCriteria['apartment-sale'],
  'The post-need Laya question must share the canonical category semantics.',
);
const neighborhoodQuestions = buildPostDecisionQuestions({
  neighborhoodCandidates: [
    { slug: 'vanak', label: 'ونک' },
    { slug: 'mirdamad', label: 'میرداماد' },
    { slug: 'tajrish', label: 'تجریش' },
  ],
});
assert(
  neighborhoodQuestions.neighborhood_candidate?.type === 'choice' &&
    Object.keys(neighborhoodQuestions.neighborhood_candidate.criteria).length === 4 &&
    neighborhoodQuestions.neighborhood_candidate.criteria.vanak?.includes('ونک') &&
    neighborhoodQuestions.neighborhood_candidate.criteria.unknown?.includes('حدس نزن'),
  'city-scoped neighborhood choices must include only supplied candidates plus abstention',
);
assert(
  !buildPostDecisionQuestions({ neighborhoodCandidates: [{ slug: 'vanak', label: 'ونک' }] }).neighborhood_candidate,
  'an exact single neighborhood candidate must stay in the deterministic resolver, not spend a Laya choice',
);
assert(
  !buildPostDecisionQuestions({
    neighborhoodCandidates: Array.from({ length: 10 }, (_, index) => ({ slug: `n-${index}`, label: `محله ${index}` })),
  }).neighborhood_candidate?.criteria['n-8'],
  'large neighborhood catalogs must be bounded to eight choices before abstention',
);
assert(questions.transaction_type && questions.property_kind && questions.usage, 'Core property questions must remain in the same Laya call.');
assert(questions.parking && questions.elevator && questions.storage, 'Amenity decisions must retain explicit questions.');
assert(offerQuestions.category_candidate?.type === 'choice' && offerQuestions.category_candidate.instructions.includes('آگهی'), 'Offer inspection must classify the original ad, not a hypothetical need.');
assert(offerQuestions.category_candidate?.type === 'choice' && offerQuestions.category_candidate.criteria['apartment-sale'] !== categoryCriteria['apartment-sale'], 'Offer-side criteria must be distinct from seeker-intent criteria.');
assert(
  offerQuestions.category_candidate?.type === 'choice' &&
    JSON.stringify(offerQuestions.category_candidate).length < 1800,
  'The full offer category choice must stay compact enough for Laya question-head limits.',
);
assert(offerQuestions.usage?.type === 'choice' && offerQuestions.usage.instructions.includes('آگهی'), 'Offer usage extraction must abstain instead of inferring user purpose.');
assert(offerQuestions.parking?.type === 'choice' && offerQuestions.parking.criteria?.unknown?.includes('چیزی گفته نشده'), 'Unmentioned listing amenities must remain unknown.');
assert(offerQuestions.transaction_type?.type === 'choice' && offerQuestions.transaction_type.criteria?.buy?.includes('فروشی'), 'Sale listings must map to the buyer-side transaction with explicit Persian sale cues.');
assert(offerQuestions.transaction_type?.type === 'choice' && offerQuestions.transaction_type.criteria?.sell?.includes('آگهیِ ملکی'), 'A seller listing must not be confused with a user asking to sell their own property.');
assert(offerQuestions.property_kind?.type === 'choice' && offerQuestions.property_kind.criteria?.office?.includes('مطب') && offerQuestions.property_kind.criteria?.shop?.includes('محل کسب'), 'Property kinds must include discriminative offer-side lexical descriptions.');

const exactApartmentQuestions = buildDivarLayaQuestionsForText(
  'یک آپارتمان برای خرید در تهران می‌خواهم.'
);
assert(
  !exactApartmentQuestions.category_candidate,
  'a single deterministic category must not be presented as a Laya decision'
);
const ambiguousCommercialQuestions = buildDivarLayaQuestionsForText(
  'برای اجاره یک فضای مزون یا دفتر در تهران می‌خواهم.'
);
assert(
  ambiguousCommercialQuestions.category_candidate?.type === 'choice' &&
    Object.keys(ambiguousCommercialQuestions.category_candidate.criteria).length === 3 &&
    ambiguousCommercialQuestions.category_candidate.criteria['shop-rent'] &&
    ambiguousCommercialQuestions.category_candidate.criteria['office-rent'] &&
    ambiguousCommercialQuestions.category_candidate.criteria.unknown,
  'ambiguous commercial needs must send only rules-derived candidates plus abstention to Laya'
);
const noCategoryQuestions = buildDivarLayaQuestionsForText(
  'یک ملک حدود ۱۳۰ متر می‌خواهم ولی نوع معامله را هنوز نمی‌دانم.'
);
assert(
  !noCategoryQuestions.category_candidate,
  'an unresolved need must not receive an unrestricted 19-way category question'
);

console.log(`Divar Laya question factory: ${expectedLeaves.length} property leaves, descriptive semantics and abstention checks passed`);
