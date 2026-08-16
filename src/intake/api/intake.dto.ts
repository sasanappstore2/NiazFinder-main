import { z } from 'zod';
import type { IntakeAnalysisResult } from '@/intake/types';

export const intakeFormHintsSchema = z.object({
  categorySlug: z.string().trim().optional(),
  subcategorySlug: z.string().trim().optional(),
  city: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  categoryLockedByUser: z.boolean().optional(),
  cityLockedByUser: z.boolean().optional(),
  neighborhoodLockedByUser: z.boolean().optional(),
  dealLockedByUser: z.boolean().optional(),
  lockedFieldKeys: z.array(z.string().trim().min(1)).max(64).optional(),
});

export const intakeAnalyzeRequestSchema = z.object({
  text: z.string().trim().min(3, 'متن باید حداقل ۳ کاراکتر باشد').max(4000),
  /** Optional city hint from cookie/URL to boost neighborhood matching. */
  citySlug: z.string().trim().optional(),
  cityName: z.string().trim().optional(),
  /** User-locked form fields — must influence analyze + cache key. */
  formHints: intakeFormHintsSchema.optional(),
  /** Step-1 AI-first: invoke semantic AI even when rules confidence is high. */
  forceAi: z.boolean().optional(),
  /** Non-blocking second pass (gist / disambig / empty critical fill). */
  enrich: z.boolean().optional(),
  /** Live compose: skip LRE and city-AI. */
  lite: z.boolean().optional(),
});

export type IntakeAnalyzeRequest = z.infer<typeof intakeAnalyzeRequestSchema>;

export const intakeAnalyzeResponseSchema = z.object({
  entities: z.object({
    vertical: z.string().nullable(),
    category: z.string().nullable(),
    categorySlug: z.string().nullable(),
    subcategorySlug: z.string().nullable(),
    city: z.string().nullable(),
    citySlug: z.string().nullable(),
    province: z.string().nullable(),
    neighborhood: z.string().nullable(),
    neighborhoodSlug: z.string().nullable(),
    area: z.number().nullable(),
    budgetMin: z.number().nullable(),
    budgetMax: z.number().nullable(),
    rooms: z.number().nullable(),
    transactionType: z.string().nullable(),
  }),
  confidence: z.record(z.string(), z.number()),
  templateId: z.string(),
  templateVersion: z.number(),
  rootSlug: z.string(),
  categoryPath: z.array(z.string()),
  detectedVertical: z.string().nullable(),
  detectedCategory: z.string().nullable(),
  missingFields: z.array(
    z.object({
      field: z.string(),
      priority: z.number(),
      required: z.boolean(),
    })
  ),
  recommendedQuestions: z.array(z.string()),
  completionScore: z.number(),
  matchabilityScore: z.number(),
  completionState: z.enum([
    'VERY_INCOMPLETE',
    'NEEDS_INFO',
    'ALMOST_READY',
    'READY_TO_PUBLISH',
  ]),
  sections: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      fields: z.array(z.string()),
    })
  ),
  nextQuestion: z
    .object({
      field: z.string(),
      type: z.enum(['singleChoice', 'text', 'number', 'location']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .optional(),
    })
    .nullable(),
  normalizedText: z.string(),
  latencyMs: z.number(),
  meta: z
    .object({
      engine: z.enum(['intake-rules', 'intake-rules+ai', 'intake-qwen', 'intake-qwen+rules']),
      indexStats: z.object({
        categories: z.number(),
        cities: z.number(),
        neighborhoods: z.number(),
      }),
    })
    .optional(),
});

export type IntakeAnalyzeResponse = IntakeAnalysisResult & {
  meta?: {
    engine: 'intake-rules' | 'intake-rules+ai' | 'intake-qwen' | 'intake-qwen+rules';
    indexStats: { categories: number; cities: number; neighborhoods: number };
    ai?: {
      engine: 'intake-rules' | 'intake-rules+ai';
      ruleConfidence: number;
      aiInvoked: boolean;
      aiProvider: string | null;
      aiLatencyMs: number;
    };
    qwen?: {
      engine: 'intake-rules' | 'intake-qwen' | 'intake-qwen+rules';
      ruleConfidence: number;
      qwenInvoked: boolean;
      qwenLatencyMs: number;
    };
    trace?: import('@/intake/types/analysis-trace').IntakeAnalysisTrace;
  };
};
