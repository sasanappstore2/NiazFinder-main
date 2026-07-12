import { z } from 'zod';

const optionalPositiveMoney = z
  .number()
  .nullable()
  .refine((n) => n == null || (Number.isFinite(n) && n > 0 && n < 1e15), {
    message: 'money out of range',
  });

const optionalArea = z
  .number()
  .nullable()
  .refine((n) => n == null || (Number.isFinite(n) && n >= 5 && n <= 100_000), {
    message: 'area out of range',
  });

const optionalRooms = z
  .number()
  .nullable()
  .refine((n) => n == null || (Number.isFinite(n) && n >= 0 && n <= 30), {
    message: 'rooms out of range',
  });

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
  budget: optionalPositiveMoney,
  budgetMin: optionalPositiveMoney.optional(),
  budgetMax: optionalPositiveMoney.optional(),
  rahnAmount: optionalPositiveMoney.optional(),
  monthlyRent: optionalPositiveMoney.optional(),
  deposit: optionalPositiveMoney.optional(),
  area: optionalArea,
  rooms: optionalRooms,
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

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
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
    budget: asNullableNumber(legacy.budget),
    budgetMin: asNullableNumber(legacy.budgetMin) ?? undefined,
    budgetMax: asNullableNumber(legacy.budgetMax) ?? undefined,
    rahnAmount: asNullableNumber(legacy.rahnAmount) ?? undefined,
    monthlyRent: asNullableNumber(legacy.monthlyRent) ?? undefined,
    deposit: asNullableNumber(legacy.deposit) ?? undefined,
    area: asNullableNumber(legacy.area),
    rooms: asNullableNumber(legacy.rooms),
    confidence: typeof legacy.confidence === 'number' ? legacy.confidence : 0.5,
  };
  const parsed = constrainedSelectionSchema.safeParse(mapped);
  return parsed.success ? parsed.data : null;
}

export function safeParseAiExtraction(raw: string): AiExtractionParsed | null {
  return safeParseConstrainedSelection(raw);
}
