import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';

const DEFAULT_PRODUCT_LEAVES = new Set(['mobile-tablet', 'electronics']);

/**
 * Rules picked the first child of a vertical (e.g. products ? electronics ? mobile-tablet)
 * without a specific product keyword ? not trustworthy over AI.
 */
export function isRulesDefaultVerticalBucket(parsed: ParsedIntent): boolean {
  if (!parsed.intentType.startsWith('product')) return false;
  const leaf = parsed.subcategorySlug ?? parsed.categorySlug;
  return DEFAULT_PRODUCT_LEAVES.has(leaf);
}

/** Rules engine fallback when text is ambiguous (e.g. short desire → services). */
export function isRulesGenericCategoryFallback(parsed: ParsedIntent): boolean {
  if (isRulesDefaultVerticalBucket(parsed)) return true;

  if (parsed.intentType !== 'general') return false;

  const leaf = parsed.subcategorySlug ?? parsed.categorySlug;
  if (!leaf || leaf === 'services') return true;

  if (leaf === 'repairs' && !parsed.subcategorySlug) return true;

  const root = getCategoryPath(leaf)[0]?.slug;
  if (root === 'services' && parsed.confidence < 0.72) return true;

  return false;
}

/** Geo-training noise: repair/service phrasing mis-tagged as property rent/sale. */
export function isRulesServiceTextMislabeledAsProperty(
  rules: ParsedIntent,
  rawText: string
): boolean {
  if (!rules.intentType.startsWith('property')) return false;
  const t = rawText.trim();
  if (
    !/برق\s*کاری|برقکار|برق‌کار|لوله\s*کشی|لوله‌کشی|تعمیر|نقاشه?\s*کاری|نظافت|اسباب\s*کشی|کولر\s*گازی/u.test(
      t
    )
  ) {
    return false;
  }
  if (/اجاره\s*آپارتمان|رهن\s*کامل|خرید\s*ملک|فروش\s*ملک|مستاجر/u.test(t)) return false;
  return true;
}

/** Rules vs LLM intent families disagree (e.g. product buy vs property rent). */
export function isLlmIntentIncoherentWithRules(
  llm: ParsedIntent,
  rules: ParsedIntent
): boolean {
  const rulesProduct = rules.intentType.startsWith('product');
  const rulesProperty = rules.intentType.startsWith('property');
  const llmProduct = llm.intentType.startsWith('product');
  const llmProperty = llm.intentType.startsWith('property');
  if (rulesProduct && llmProperty) return true;
  if (rulesProperty && llmProduct) return true;
  return false;
}
