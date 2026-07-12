/**
 * Readiness — RFC-002 Part 10. Three independent dimensions (Semantic/Business/Publication)
 * and five ladder states (§92). Confidence never bypasses a blocking business requirement
 * (ADR-044); clarifications should target only what's actually blocking (§95).
 *
 * v1 scope note: `published` is included in the level enum for RFC fidelity, but
 * `computeReadiness` never returns it — reaching Published means the Need was actually accepted
 * by the marketplace (a real persistence/publish action), which is outside what a stateless
 * readiness calculation can honestly claim.
 */
import { z } from 'zod';

export const READINESS_LEVELS = ['incomplete', 'interpretable', 'valid', 'ready', 'published'] as const;
export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

export const readinessSchema = z.object({
  /** Do we understand the need at all — primary intent + at least one entity identified? */
  semanticReady: z.boolean(),
  /** Can the marketplace process it — every mandatory domain has an accepted claim? */
  businessReady: z.boolean(),
  /** semanticReady && businessReady — RFC-002 §91, exists only when both are satisfied. */
  publicationReady: z.boolean(),
  level: z.enum(READINESS_LEVELS),
  /** RFC-002 §94 Readiness Matrix — the actual named obstacles, not just a boolean. */
  blockingDomains: z.array(z.string()),
});
export type Readiness = z.infer<typeof readinessSchema>;
