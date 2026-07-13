/**
 * Domains a Need must have an accepted claim for before it's Business Ready (RFC-002 §91,
 * mirrors the existing `REQUIRED_REAL_ESTATE` pattern in
 * `src/intake/intelligence-engine/scoring/field-confidence-engine.ts`). v1 lists both domains
 * Phase 2's Grounding currently covers — category and location — since a listing without either
 * genuinely can't be matched or shown on the marketplace today. Extend this set as later phases
 * add more grounding domains (brand, budget-as-a-real-constraint-domain, etc).
 */
export const MANDATORY_DOMAINS: ReadonlySet<string> = new Set(['category', 'location']);
