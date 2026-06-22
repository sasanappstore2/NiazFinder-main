/**
 * Single source of truth for intake API request validation.
 *
 * Re-exports the two schemas that already existed and ADDS Zod schemas for the
 * three endpoints that previously parsed with `body.x as T` casts. Every intake
 * route imports from here so validation lives in one place.
 */
import { z } from 'zod';
import { isIntentType } from '@/config/need-intents';

// Re-export existing schemas so callers have a single import surface.
export {
  publishRequestSchema,
  type PublishRequestBody,
} from '@/lib/queue/schemas/intake-publish';
export { intakeAnalyzeRequestSchema } from '@/intake/api/intake.dto';

/** POST /api/need-intake/next-question */
export const nextQuestionRequestSchema = z.object({
  // Validate against the intent registry up-front (was a manual handler check).
  intentType: z.string().refine(isIntentType, { message: 'intentType نامعتبر است' }),
  parsedIntent: z.object({}).passthrough(),
  answers: z.record(z.string(), z.unknown()).default({}),
});
export type NextQuestionRequestBody = z.infer<typeof nextQuestionRequestSchema>;

/** POST /api/need-intake/extract-slots */
export const extractSlotsRequestSchema = z.object({
  parsedIntent: z
    .object({
      intentType: z.string().min(1),
      categorySlug: z.string().min(1),
    })
    .passthrough(),
  answers: z.record(z.string(), z.unknown()).default({}),
  lastAnswer: z
    .object({
      fieldKey: z.string(),
      value: z.union([z.string(), z.number()]),
    })
    .optional(),
});
export type ExtractSlotsRequestBody = z.infer<typeof extractSlotsRequestSchema>;

/** POST /api/need-intake/preview-listing */
export const previewListingRequestSchema = z.object({
  draft: z
    .object({
      templateId: z.string().min(1),
      entities: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
  extras: z.array(z.string()).optional(),
});
export type PreviewListingRequestBody = z.infer<typeof previewListingRequestSchema>;
