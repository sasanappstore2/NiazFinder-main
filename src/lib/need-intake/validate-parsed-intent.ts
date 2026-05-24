import { z } from 'zod';
import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import {
  DEFAULT_INTENT,
  getIntentsForCategory,
  isIntentType,
} from '@/config/need-intents';

const VALID_CATEGORY_SLUGS = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

const urgencySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional();

export const llmParsedIntentSchema = z.object({
  intentType: z.string(),
  categorySlug: z.string(),
  subcategorySlug: z.string().nullish(),
  title: z.string().optional(),
  description: z.string().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  urgency: urgencySchema,
  confidence: z.number().min(0).max(1).optional(),
  entities: z.record(z.string(), z.string()).optional(),
});

export type LlmParsedIntentRaw = z.infer<typeof llmParsedIntentSchema>;

function normalizeCategorySlug(slug: string, fallback: string): string {
  const s = slug.trim().toLowerCase();
  if (VALID_CATEGORY_SLUGS.has(s)) return s;
  return VALID_CATEGORY_SLUGS.has(fallback) ? fallback : 'services';
}

function normalizeIntentType(intent: string, categorySlug: string): IntentType {
  const allowed = getIntentsForCategory(categorySlug);
  if (isIntentType(intent) && allowed.includes(intent)) return intent;
  if (isIntentType(intent)) {
    return allowed[0] ?? DEFAULT_INTENT;
  }
  return allowed[0] ?? DEFAULT_INTENT;
}

export function validateAndNormalizeLlmParsed(
  raw: unknown,
  rawText: string,
  ruleFallback: ParsedIntent
): ParsedIntent {
  const parsed = llmParsedIntentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...ruleFallback, rawText };
  }

  const d = parsed.data;
  const categorySlug = normalizeCategorySlug(d.categorySlug, ruleFallback.categorySlug);
  const intentType = normalizeIntentType(d.intentType, categorySlug);

  let confidence = d.confidence ?? 0.7;
  confidence = Math.min(Math.max(confidence, 0), 1);

  return {
    intentType,
    categorySlug,
    subcategorySlug: d.subcategorySlug ?? undefined,
    title: d.title?.trim().slice(0, 120) || ruleFallback.title,
    description: d.description?.trim() || ruleFallback.description,
    budgetMin: d.budgetMin ?? ruleFallback.budgetMin,
    budgetMax: d.budgetMax ?? ruleFallback.budgetMax,
    city: d.city?.trim() || ruleFallback.city,
    province: d.province?.trim() || ruleFallback.province,
    urgency: d.urgency ?? ruleFallback.urgency,
    confidence,
    entities: { ...ruleFallback.entities, ...(d.entities ?? {}) },
    rawText,
  };
}
