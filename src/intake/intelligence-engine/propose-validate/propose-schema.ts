/**
 * Schema for the LLM proposal stage. The model returns RANKED candidate lists
 * (top-5 category leaf slugs + top-5 neighborhood names) plus city/province —
 * it proposes, the validators (real tree + catalog) decide.
 */
import { z } from 'zod';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';

export const proposeSchema = z.object({
  /** Up to 5 category LEAF slugs, ranked best-first, strictly from the provided list. */
  categories: z.array(z.string()).max(8).default([]),
  /** City as written in the need (free text). */
  city: z.string().nullable().default(null),
  /** Province as written / inferred (free text, display-only). */
  province: z.string().nullable().default(null),
  /** Up to 5 neighborhood NAMES exactly as written in the need (no list given). */
  neighborhoods: z.array(z.string()).max(8).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type ProposeParsed = z.infer<typeof proposeSchema>;

/** Parse the model's raw text → validated proposal, or null on failure (degradation signal). */
export function safeParsePropose(raw: string): ProposeParsed | null {
  const json = parseAiJsonPayload(raw);
  if (json == null || typeof json !== 'object') return null;
  const parsed = proposeSchema.safeParse(json);
  if (!parsed.success) return null;
  // Defensive: trim + drop empties.
  const clean = (arr: string[]) =>
    [...new Set(arr.map((s) => s.trim()).filter(Boolean))].slice(0, 5);
  return {
    ...parsed.data,
    categories: clean(parsed.data.categories),
    neighborhoods: clean(parsed.data.neighborhoods),
    city: parsed.data.city?.trim() || null,
    province: parsed.data.province?.trim() || null,
  };
}
