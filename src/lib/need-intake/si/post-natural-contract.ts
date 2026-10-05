import { z } from 'zod';

export const POST_NATURAL_SCHEMA_VERSION = 2 as const;

export const postNaturalAnalyzeRequestSchema = z.object({
  sourceText: z.string().trim().min(3, 'متن باید حداقل ۳ کاراکتر باشد').max(8_000),
  draftRevision: z.number().int().nonnegative().optional(),
  cityName: z.string().trim().max(120).optional(),
  citySlug: z.string().trim().max(120).optional(),
  categorySlug: z.string().trim().max(120).optional(),
  subcategorySlug: z.string().trim().max(120).optional(),
  categoryLockedByUser: z.boolean().optional(),
  cityLockedByUser: z.boolean().optional(),
  neighborhoodLockedByUser: z.boolean().optional(),
  lockedFieldKeys: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
  existingFields: z.record(z.string().max(80), z.unknown()).optional(),
});

export type PostNaturalAnalyzeRequest = z.infer<typeof postNaturalAnalyzeRequestSchema>;

export const postNaturalFieldSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['deterministic-parser', 'si', 'existing-context', 'derived']),
  requiresConfirmation: z.boolean(),
  evidence: z.string().max(240).optional(),
  /** City carried by location suggestion chips (multi-city matches). */
  city: z.string().max(120).optional(),
  /** Neighborhood/catalog slug carried by location suggestion chips. */
  slug: z.string().max(120).optional(),
});

export type PostNaturalField = z.infer<typeof postNaturalFieldSchema>;

export const postNaturalAnalyzeResponseSchema = z.object({
  schemaVersion: z.literal(POST_NATURAL_SCHEMA_VERSION),
  requestId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  normalizedText: z.string(),
  draftPatch: z
    .object({
      entities: z.record(z.string(), z.unknown()).optional(),
      answers: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  fields: z.array(postNaturalFieldSchema),
  provisionalCategory: z
    .object({
      slug: z.string().min(1),
      confidence: z.number().min(0).max(1),
      reason: z.string().max(240).optional(),
      requiresConfirmation: z.boolean(),
    })
    .optional(),
  categoryCandidates: z.array(
    z.object({
      slug: z.string().min(1),
      label: z.string().min(1),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
  locationCandidates: z.array(
    z.object({
      slug: z.string().min(1),
      label: z.string().min(1),
      city: z.string().optional(),
      /** Catalog city id behind a multi-city candidate (for city chips). */
      citySlug: z.string().min(1).optional(),
    })
  ),
  gaps: z.array(z.string()),
  warnings: z.array(z.string()),
  missingFieldKeys: z.array(z.string()),
  si: z.object({
    status: z.enum(['ready', 'unavailable', 'skipped']),
    model: z.literal('si'),
    latencyMs: z.number().nonnegative(),
    usage: z.record(z.string(), z.number()).optional(),
  }),
  latencyMs: z.number().nonnegative(),
});

export type PostNaturalAnalyzeResponse = z.infer<typeof postNaturalAnalyzeResponseSchema>;
