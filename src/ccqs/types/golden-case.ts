/**
 * GoldenCase — CCQS §1.1 (`PLAN/ccqs-architecture.md`). Ground truth, git-tracked (never only a
 * DB row) — reviewable in a PR diff, attributable, immune to silent runtime mutation. Never
 * deleted once added, only `deprecated` (mirrors SEE's reason-code lifecycle, §14.5 of the SEE doc).
 */
import { z } from 'zod';

export const goldenCaseSchema = z.object({
  caseId: z.string().min(1),
  rawText: z.string().min(1),
  /** Canonical category slug, or null when this case genuinely has none (a control case). */
  expectedCategory: z.string().nullable(),
  /** Raw city text; null means "no location expected" for this case. */
  expectedLocationCity: z.string().nullable(),
  tags: z.array(z.string()),
  addedAt: z.string(),
  /** Mandatory — a golden case with no stated reason is not trustworthy ground truth. */
  reason: z.string().min(1),
  deprecated: z.boolean().default(false),
});
export type GoldenCase = z.infer<typeof goldenCaseSchema>;
