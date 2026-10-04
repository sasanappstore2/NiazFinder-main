import { z } from 'zod';

/** Minimal draft shape for publish request validation at the API boundary. */
const needDraftSchema = z.object({
  templateId: z.string().min(1),
  /** Matches NeedDraft.templateVersion (src/contracts/need-intake.ts) — a number, not a string. */
  templateVersion: z.number().optional(),
  sourceText: z.string().optional(),
  entities: z.record(z.string(), z.unknown()),
  parsedIntent: z
    .object({
      categorySlug: z.string().optional(),
      subcategorySlug: z.string().optional(),
    })
    .passthrough()
    .optional(),
  listingPreview: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      titleSource: z.string().optional(),
    })
    .optional(),
  completionScore: z.number().optional(),
  matchabilityScore: z.number().optional(),
  intakeTrace: z.unknown().optional(),
  fieldMeta: z.record(z.string(), z.unknown()).optional(),
  analysisSnapshot: z.unknown().optional(),
}).passthrough();

const listingPreviewSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    titleSource: z.string().optional(),
  })
  .passthrough();

export const intakePublishSnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  draft: needDraftSchema,
  listingPreview: listingPreviewSchema,
  draftRevision: z.number().int().nonnegative(),
  draftHash: z.string().regex(/^[a-f0-9]{64}$/i),
  idempotencyKey: z.string().min(16).max(160),
  createdAt: z.string().datetime(),
});

export const publishRequestSchema = z.object({
  draft: needDraftSchema,
  listingPreview: listingPreviewSchema.optional(),
  snapshot: intakePublishSnapshotSchema.optional(),
  idempotencyKey: z.string().min(16).max(160).optional(),
  sessionId: z.string().optional(),
  linkToBusinessProfile: z.boolean().optional(),
});

export type PublishRequestBody = z.infer<typeof publishRequestSchema>;

export const intakeAiTaskSchema = z.object({
  jobId: z.string().min(1),
  serviceRequestId: z.string().min(1),
  text: z.string().min(1),
  citySlug: z.string().optional(),
  cityName: z.string().optional(),
  userId: z.string().optional(),
});

export type IntakeAiTaskMessage = z.infer<typeof intakeAiTaskSchema>;
