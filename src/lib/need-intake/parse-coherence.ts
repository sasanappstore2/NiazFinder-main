import type { ParsedIntent } from '@/contracts/need-intake';
import { normalizeCategoryPair } from '@/config/categories';
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
  const entities = { ...rules.entities, ...llm.entities };

  const rulesConfident = isVerticalConfident(cls) || rules.confidence >= 0.7;
  const llmWrongServices =
    isServicesIntent(llm.intentType) || isServicesCategory(llm.categorySlug);
  const rulesProperty =
    rules.intentType.startsWith('property') ||
    rules.categorySlug.includes('apartment') ||
    rules.categorySlug.includes('rent') ||
    cls.vertical === 'real-estate';

  if (rulesConfident && llmWrongServices && rulesProperty && cls.vertical === 'real-estate') {
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

  return {
    ...llm,
    intentType,
    categorySlug,
    subcategorySlug: llm.subcategorySlug ?? rules.subcategorySlug,
    confidence,
    entities,
    city: llm.city ?? rules.city,
    budgetMin: llm.budgetMin ?? rules.budgetMin,
    budgetMax: llm.budgetMax ?? rules.budgetMax,
    title: (llm.title?.length ?? 0) >= 8 ? llm.title : rules.title,
    description:
      (llm.description?.length ?? 0) >= llm.rawText.length * 0.5
        ? llm.description
        : rules.description,
  };
}
