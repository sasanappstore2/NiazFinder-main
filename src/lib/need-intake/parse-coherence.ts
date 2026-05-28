import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import { buildPropertyTitle, buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';
import { toAsciiDigits } from '@/lib/need-intake/extract-property-slots';
import {
  categorySlugForVertical,
  classifyVertical,
  isVerticalConfident,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

function isServicesIntent(intent: ParsedIntent['intentType']): boolean {
  return (
    intent === 'service_request' ||
    intent === 'booking' ||
    intent === 'consultation' ||
    intent === 'help_request'
  );
}

function isServicesCategory(slug: string): boolean {
  const roots = ['services', 'repairs', 'cleaning', 'plumbing', 'moving', 'electrical', 'painting'];
  return roots.some((r) => slug === r || slug.startsWith(r));
}

/** Fix LLM misclassification when rules/classifier strongly disagree. */
export function reconcileParsedIntent(
  llm: ParsedIntent,
  rules: ParsedIntent,
  rawText: string,
  classification?: VerticalClassification
): ParsedIntent {
  const cls = classification ?? classifyVertical(rawText);
  let intentType = llm.intentType;
  let categorySlug = llm.categorySlug;
  let confidence = llm.confidence;
  const partnershipRequest = isConstructionPartnershipText(rawText);
  let entities: Record<string, string> = partnershipRequest
    ? { ...llm.entities, ...rules.entities, serviceKind: 'partnership' }
    : { ...rules.entities, ...llm.entities };
  if (partnershipRequest) {
    delete entities.dealType;
  }

  const rulesConfident = isVerticalConfident(cls) || rules.confidence >= 0.7;
  const llmWrongServices =
    isServicesIntent(llm.intentType) || isServicesCategory(llm.categorySlug);
  const rulesProperty =
    rules.intentType.startsWith('property') ||
    rules.categorySlug.includes('apartment') ||
    rules.categorySlug.includes('rent') ||
    cls.vertical === 'real-estate';

  if (partnershipRequest) {
    intentType = rules.intentType;
    categorySlug = rules.categorySlug;
    confidence = Math.max(rules.confidence, confidence, 0.88);
  } else if (rulesConfident && llmWrongServices && rulesProperty && cls.vertical === 'real-estate') {
    const slug = categorySlugForVertical('real-estate', rawText);
    const pair = normalizeCategoryPair(slug);
    categorySlug = pair.categorySlug;
    intentType = rules.intentType.startsWith('property')
      ? rules.intentType
      : 'property_search';
    confidence = Math.max(confidence, rules.confidence, 0.78);
  } else if (
    rulesConfident &&
    llmWrongServices &&
    cls.vertical === 'vehicles' &&
    rules.intentType.startsWith('vehicle')
  ) {
    const pair = normalizeCategoryPair(rules.categorySlug);
    categorySlug = pair.categorySlug;
    intentType = rules.intentType;
    confidence = Math.max(confidence, 0.75);
  } else if (
    rulesConfident &&
    llmWrongServices &&
    cls.vertical === 'products' &&
    rules.intentType.startsWith('product')
  ) {
    const pair = normalizeCategoryPair(rules.categorySlug);
    categorySlug = pair.categorySlug;
    intentType = rules.intentType;
    confidence = Math.max(confidence, 0.75);
  } else if (rules.confidence > confidence + 0.12 && rules.categorySlug !== 'services') {
    categorySlug = rules.categorySlug;
    intentType = rules.intentType;
    confidence = Math.max(confidence, rules.confidence);
  }

  if (cls.certainty >= 0.4 && cls.score >= 3) {
    confidence = Math.min(0.95, confidence + cls.certainty * 0.1);
  }

  const city = llm.city ?? rules.city;
  const mergedEntities = entities;
  const areaName = mergedEntities.area;
  const isProperty = intentType.startsWith('property');
  const isPartnership =
    intentType === 'real_estate_service' ||
    isConstructionPartnershipText(rawText) ||
    mergedEntities.serviceKind === 'partnership';

  let title = (llm.title?.length ?? 0) >= 8 ? llm.title! : rules.title;
  if (isPartnership) {
    title = buildRealEstateServiceTitle(mergedEntities, city);
  } else if (isProperty) {
    const rawNorm = toAsciiDigits(rawText.toLowerCase());
    const llmClaimsRooms =
      mergedEntities.rooms &&
      !rawNorm.includes(`${mergedEntities.rooms} خواب`) &&
      !rawNorm.includes('خواب');
    title = buildPropertyTitle(intentType, mergedEntities, city, areaName);
    if (llmClaimsRooms && (llm.title?.length ?? 0) >= 8) {
      const { rooms: _roomsOmit, ...withoutRooms } = mergedEntities;
      title = buildPropertyTitle(intentType, withoutRooms, city, areaName);
    }
  }

  return {
    ...llm,
    intentType,
    categorySlug,
    subcategorySlug: partnershipRequest
      ? rules.subcategorySlug ?? llm.subcategorySlug
      : llm.subcategorySlug ?? rules.subcategorySlug,
    confidence,
    entities: mergedEntities,
    city,
    budgetMin: llm.budgetMin ?? rules.budgetMin,
    budgetMax: llm.budgetMax ?? rules.budgetMax,
    title,
    description:
      (llm.description?.length ?? 0) >= llm.rawText.length * 0.5
        ? llm.description
        : rules.description,
  };
}

const PRODUCT_ROOTS = new Set([
  'electronics',
  'home-appliances',
  'personal-items',
  'entertainment',
]);

/** Rules path: category slug should align with classified vertical. */
export function isCategoryVerticalCoherent(
  categorySlug: string,
  vertical: VerticalClassification['vertical']
): boolean {
  const root = getCategoryPath(categorySlug)[0]?.slug ?? categorySlug;
  switch (vertical) {
    case 'real-estate':
      return root === 'real-estate';
    case 'vehicles':
      return root === 'vehicles';
    case 'products':
      return PRODUCT_ROOTS.has(root);
    case 'services':
      return root === 'services';
    case 'jobs':
      return root === 'jobs';
    case 'social':
      return root === 'social';
    default:
      return true;
  }
}
