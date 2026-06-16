import { z } from 'zod';

export const truthVerdictSchema = z.object({
  field: z.string(),
  status: z.enum(['correct', 'incorrect', 'missing']),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasonFa: z.string().optional(),
});

export const truthVerificationResponseSchema = z.object({
  verdicts: z.array(truthVerdictSchema),
  overallConfidence: z.number().min(0).max(1).optional(),
});

export type TruthVerdict = z.infer<typeof truthVerdictSchema>;
export type TruthVerificationResponse = z.infer<typeof truthVerificationResponseSchema>;

export function parseTruthVerificationResponse(raw: string): TruthVerificationResponse | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const json = JSON.parse(candidate.slice(start, end + 1));
    const parsed = truthVerificationResponseSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
