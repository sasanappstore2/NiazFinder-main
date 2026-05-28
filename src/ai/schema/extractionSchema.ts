import { z } from 'zod';

/**
 * Constrained selection schema — values must match candidate slugs exactly.
 * `category` = leaf category slug (e.g. apartment-rent).
 * `city` / `neighborhood` = registry slugs, not free text.
 */
export const constrainedSelectionSchema = z.object({
  category: z.string().nullable(),
  city: z.string().nullable(),
  neighborhood: z.string().nullable(),
  transactionType: z.string().nullable(),
  budget: z.number().nullable(),
  area: z.number().nullable(),
  rooms: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ConstrainedSelectionParsed = z.infer<typeof constrainedSelectionSchema>;

/** @deprecated Use constrainedSelectionSchema — kept for backward-compatible parse attempts. */
export const aiExtractionSchema = constrainedSelectionSchema.extend({
  vertical: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
});

export type AiExtractionParsed = z.infer<typeof aiExtractionSchema>;

export function parseAiJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function safeParseConstrainedSelection(raw: string): ConstrainedSelectionParsed | null {
  const json = parseAiJsonPayload(raw);
  if (json == null) return null;

  const direct = constrainedSelectionSchema.safeParse(json);
  if (direct.success) return direct.data;

  // Legacy shape: subcategory holds leaf slug
  const legacy = json as Record<string, unknown>;
  const mapped = {
    category: (legacy.subcategory ?? legacy.category) as string | null,
    city: legacy.city as string | null,
    neighborhood: legacy.neighborhood as string | null,
    transactionType: legacy.transactionType as string | null,
    budget: legacy.budget as number | null,
    area: legacy.area as number | null,
    rooms: legacy.rooms as number | null,
    confidence: legacy.confidence as number,
  };
  const parsed = constrainedSelectionSchema.safeParse(mapped);
  return parsed.success ? parsed.data : null;
}

export function safeParseAiExtraction(raw: string): AiExtractionParsed | null {
  return safeParseConstrainedSelection(raw);
}
