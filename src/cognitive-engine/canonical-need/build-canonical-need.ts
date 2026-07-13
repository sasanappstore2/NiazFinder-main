/**
 * RFC-002 Part 7 — assembles the Canonical Need Object from Phases 1-3's outputs. This is a
 * projection, not a new extraction step: Evidence comes from Phase 1, Semantic entities from
 * Phase 3's Decisions, Constraints reuses the existing `budget-resolver.ts` unchanged (the only
 * genuinely machine-readable, numeric constraint source available today — see the type file for
 * why `budgetMin` and full RFC-001 intent classification are honestly omitted rather than faked).
 */
import { resolveBudget } from '@/intake/intelligence-engine/resolvers/budget-resolver';
import { claimsFromDecisions } from '@/cognitive-engine/truth/claims';
import type { Evidence } from '@/cognitive-engine/types/evidence';
import type { Decision } from '@/cognitive-engine/types/decision';
import type { CanonicalNeedObject, CNOSemanticEntity } from '@/cognitive-engine/types/canonical-need';

/** Exported so CCQS's EngineVersionManifest (`PLAN/ccqs-architecture.md` §1.2) can reuse the same
 *  identifier rather than maintaining a second, parallel version string.
 *  History: `-prod-readiness-1` = Production Readiness pass (depth-0 menu-category exclusion in
 *  `groundCategory`). `-ops-1` = Operationalization Roadmap M4: deterministic location-catalog
 *  query ordering, deterministic replay LLM sampling (temp 0 + fixed seed under
 *  COGNITIVE_REPLAY_DETERMINISTIC — replay CLIs only, production sampling unchanged), and the
 *  location-catalog version axis in the manifest (Replay Determinism Audit §6, D-narrow). */
export const ENGINE_VERSION = 'cognitive-engine-v1-phase4-ops-1';

function numericValue(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function buildConstraints(rawText: string): CanonicalNeedObject['constraints'] {
  const fields = resolveBudget(rawText);
  return {
    budgetMax: numericValue(fields.budgetMax?.value),
    rahnAmount: numericValue(fields.rahnAmount?.value),
    monthlyRent: numericValue(fields.monthlyRent?.value),
    deposit: numericValue(fields.deposit?.value),
  };
}

function buildSemanticEntities(decisions: Decision[]): CNOSemanticEntity[] {
  return decisions
    .filter((d): d is Decision & { preferred: NonNullable<Decision['preferred']> } => d.preferred != null)
    .map((d) => ({
      domain: d.domain,
      value: d.preferred.label,
      confidence: d.preferred.score,
      decided: !d.requiresClarification || d.preferred.state === 'confirmed',
    }));
}

export function buildCanonicalNeedObject(
  rawText: string,
  evidence: Evidence[],
  decisions: Decision[],
  now: string
): CanonicalNeedObject {
  const firstAction = evidence.find((e) => e.type === 'ACTION');
  const contextNotes = evidence.filter((e) => e.type === 'CONTEXT').map((e) => e.value);
  const claims = claimsFromDecisions(decisions, now);
  const accepted = claims.filter((c) => c.status === 'accepted');
  const overallConfidence = accepted.length
    ? accepted.reduce((sum, c) => sum + c.confidence, 0) / accepted.length
    : 0;

  return {
    identity: { needId: null, version: 1, status: 'draft', createdAt: now, updatedAt: now },
    semantic: { primaryIntent: firstAction?.value ?? null, entities: buildSemanticEntities(decisions) },
    constraints: buildConstraints(rawText),
    context: { notes: contextNotes },
    evidence,
    claims,
    metadata: { engineVersion: ENGINE_VERSION, overallConfidence },
  };
}
