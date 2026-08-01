/**
 * RFC-002 Part 4 — Grounding entry point. Converts Evidence into GroundedEvidence by
 * calling the EXISTING, unchanged resolvers (location-lre-bridge, category rules matcher)
 * and re-shaping their candidate output into the typed contract. No new resolution logic
 * lives here — per ADR-016, this file retrieves; it never decides.
 */
import { unifiedNormalize } from '@/intake/intelligence-engine/normalizer/unified-normalizer';
import { resolveLocationViaLre } from '@/intake/intelligence-engine/resolvers/location-lre-bridge';
import { matchCategoryCandidatesFromRules } from '@/intake/rules/registry.server';
import { getCategoryBySlug } from '@/config/categories';
import type { Evidence, EvidenceType } from '@/cognitive-engine/types/evidence';
import type {
  GroundedCandidate,
  GroundedEvidence,
  GroundingStatus,
} from '@/cognitive-engine/types/grounded-evidence';

const LOCATION_RESOLVER_NAME = 'location-lre-bridge';
const CATEGORY_RESOLVER_NAME = 'category-rules-matcher';

/** RFC-002 §30 — a candidate list is ambiguous when no single option clearly dominates. */
const CLEAR_WINNER_GAP = 0.15;

/**
 * A lone candidate is not automatically trustworthy — "only one option was found" is a fact about
 * the SEARCH, not about confidence in the answer. Below this bar, a sole candidate is still
 * surfaced (never silently dropped) but marked `ambiguous` rather than `resolved`, so the Decision
 * Engine's clarification logic sees it. Fixes a real bug found during the Cognitive Engine quality
 * pass: `statusFromRankedCandidates` used to treat candidate COUNT alone (===1) as sufficient for
 * "resolved", regardless of how weak that single candidate's confidence was — combined with the
 * confidence-scale bug (see `location-lre-bridge.ts`'s `toUnitConfidence`), a weak nationwide
 * fuzzy-match landing as the only candidate could reach "resolved" status entirely on its own.
 */
const MIN_SOLE_CANDIDATE_CONFIDENCE = 0.5;

function evidenceIdsByType(evidence: Evidence[], types: EvidenceType[]): string[] {
  return evidence.filter((e) => types.includes(e.type)).map((e) => e.id);
}

function evidenceIdsMentioning(evidence: Evidence[], text: string | null | undefined): string[] {
  if (!text) return [];
  return evidence
    .filter((e) => e.sourceSpan.includes(text) || e.value.includes(text))
    .map((e) => e.id);
}

function statusFromRankedCandidates(candidates: GroundedCandidate[]): GroundingStatus {
  if (candidates.length === 0) return 'unresolved';
  if (candidates.length === 1) {
    return candidates[0]!.confidence >= MIN_SOLE_CANDIDATE_CONFIDENCE ? 'resolved' : 'ambiguous';
  }
  const gap = candidates[0]!.confidence - candidates[1]!.confidence;
  return gap >= CLEAR_WINNER_GAP ? 'resolved' : 'ambiguous';
}

/**
 * Confidence-normalization audit finding: every candidate's confidence MUST already be on [0,1]
 * by the time it reaches this file (the conversion happens once, at the source, in
 * `location-lre-bridge.ts`'s `toUnitConfidence`). This is the enforcement point for "invalid
 * confidence must be visible" — an out-of-range value is a real upstream defect (exactly the class
 * of bug that silently clamped a 0-100 score to a false-maximum 1.0), so it is logged loudly and
 * the offending candidate is dropped rather than silently included with a wrong number.
 */
function keepIfUnitConfidence(candidates: GroundedCandidate[]): GroundedCandidate[] {
  return candidates.filter((c) => {
    if (Number.isFinite(c.confidence) && c.confidence >= 0 && c.confidence <= 1) return true;
    console.error(
      `[cognitive-engine-grounding] INVALID CONFIDENCE: resolver="${c.resolver}" id="${c.id}" confidence=${c.confidence} is outside [0,1] — dropping this candidate. This indicates an unnormalized upstream score reaching the grounding layer.`
    );
    return false;
  });
}

async function groundLocation(evidence: Evidence[], rawText: string): Promise<GroundedEvidence> {
  const { lookupKey } = unifiedNormalize(rawText);
  const result = await resolveLocationViaLre(lookupKey, rawText, { text: rawText });

  const cityCandidates: GroundedCandidate[] = keepIfUnitConfidence(
    (result.parsedLocationPatch?.cityCandidates ?? []).map((c) => ({
      id: c.cityId,
      label: c.label,
      // Canonical contract: `c.score` is already unit-scale as of the confidence-normalization
      // fix in `location-lre-bridge.ts` — `?? 0.5` only covers a genuinely-absent score (not a
      // scale bug), matching this domain's "assume moderate confidence when unstated" convention.
      confidence: c.score ?? 0.5,
      resolver: LOCATION_RESOLVER_NAME,
    }))
  );
  const neighborhoodCandidates: GroundedCandidate[] = keepIfUnitConfidence(
    (result.candidates ?? []).map((c) => ({
      id: c.slug,
      label: c.city ? `${c.label}, ${c.city}` : c.label,
      confidence: c.score,
      resolver: LOCATION_RESOLVER_NAME,
    }))
  );

  const cityValue = typeof result.fields.city?.value === 'string' ? result.fields.city.value : undefined;
  const neighborhoodValue =
    typeof result.fields.neighborhood?.value === 'string' ? result.fields.neighborhood.value : undefined;
  const citySlugValue =
    typeof result.fields.citySlug?.value === 'string' ? result.fields.citySlug.value : undefined;

  // The underlying resolver's own status tracks NEIGHBORHOOD completeness, not whether a
  // location was found at all — a bare city mention with no district correctly comes back
  // "unresolved" from it (see location-lre-bridge.ts), yet `fields.city` is still populated
  // and perfectly usable for grounding. A city-only match is a legitimate, resolved location
  // grounding in its own right; neighborhood ambiguity is a finer-grained, separate concern.
  let candidates: GroundedCandidate[];
  let status: GroundingStatus;
  if (cityValue) {
    const label = neighborhoodValue ? `${neighborhoodValue}, ${cityValue}` : cityValue;
    candidates = [
      {
        id: citySlugValue ?? label,
        label,
        confidence: result.fields.city?.confidence ?? 0.9,
        resolver: LOCATION_RESOLVER_NAME,
      },
    ];
    // Neighborhood-level ambiguity still surfaces as extra candidates for the Decision
    // Engine (Phase 3) to weigh, it just doesn't demote the whole grounding to "unresolved".
    if (result.status === 'ambiguous' || result.status === 'unresolved') {
      candidates.push(...neighborhoodCandidates.filter((c) => c.label !== candidates[0]!.label));
    }
    status = result.status === 'ambiguous' && neighborhoodCandidates.length > 0 ? 'ambiguous' : 'resolved';
  } else {
    // No city identified at all — surface whatever city-level candidates exist, or nothing.
    candidates = [...cityCandidates, ...neighborhoodCandidates].sort((a, b) => b.confidence - a.confidence);
    status = statusFromRankedCandidates(candidates);
  }

  const relatedEvidenceIds = new Set([
    ...evidenceIdsMentioning(evidence, result.fields.city?.value as string | undefined),
    ...evidenceIdsMentioning(evidence, result.fields.neighborhood?.value as string | undefined),
    ...evidenceIdsByType(evidence, ['CONTEXT']),
  ]);

  return {
    domain: 'location',
    status,
    candidates,
    derivedFromEvidenceIds: [...relatedEvidenceIds],
  };
}

/**
 * Production Readiness pass — Baseline Report V1, Root Cause B (and the residual ambiguity
 * uncovered while fixing it): depth-0 categories (`real-estate`, `vehicles`, `electronics`, ...)
 * are documented in `src/config/categories.ts` as menu/navigation groupings ("Depth 0 = top
 * section... for menu"), never a valid final answer for a real listing. But
 * `matchCategoryCandidatesFromRules` scores them like any other candidate whenever their own
 * generic keyword also matches (e.g. "real-estate" matches "آپارتمان" too, at a lower priority) —
 * so a depth-0 category routinely ends up as a close SECOND candidate, tripping the Decision
 * Engine's clear-winner-gap check (`requiresClarification=true`) even when the real depth-1/2
 * leaf candidate is completely unambiguous. Verified live: fixing the apartment-rent/apartment-sale
 * tie (see legacy-bridge.ts) still left every real-estate case flagged ambiguous purely because
 * `real-estate` itself lingered as a phantom competitor. Excluding depth-0 candidates here — never
 * valid answers by the registry's own design — is the general fix, not a per-case score tweak.
 */
function isMenuOnlyCategory(slug: string): boolean {
  return getCategoryBySlug(slug)?.depth === 0;
}

function groundCategory(evidence: Evidence[], rawText: string): GroundedEvidence {
  const raw = matchCategoryCandidatesFromRules(rawText, { limit: 5 }).filter((c) => !isMenuOnlyCategory(c.slug));
  const candidates: GroundedCandidate[] = keepIfUnitConfidence(
    raw.map((c) => ({
      id: c.slug,
      label: getCategoryBySlug(c.slug)?.title ?? c.slug,
      confidence: c.confidence,
      resolver: CATEGORY_RESOLVER_NAME,
    }))
  );

  return {
    domain: 'category',
    status: statusFromRankedCandidates(candidates),
    candidates,
    derivedFromEvidenceIds: evidenceIdsByType(evidence, ['IDENTITY']),
  };
}

/**
 * Grounds Evidence against the platform's existing knowledge resolvers. Per ADR-017, a
 * resolver failure degrades confidence — it never stops the pipeline: each domain is
 * grounded independently, and one domain throwing does not prevent the other from resolving.
 */
export async function groundEvidence(
  evidence: Evidence[],
  rawText: string
): Promise<GroundedEvidence[]> {
  const [location, category] = await Promise.allSettled([
    groundLocation(evidence, rawText),
    Promise.resolve(groundCategory(evidence, rawText)),
  ]);

  const results: GroundedEvidence[] = [];
  if (location.status === 'fulfilled') results.push(location.value);
  else {
    results.push({ domain: 'location', status: 'unresolved', candidates: [], derivedFromEvidenceIds: [] });
  }
  if (category.status === 'fulfilled') results.push(category.value);
  else {
    results.push({ domain: 'category', status: 'unresolved', candidates: [], derivedFromEvidenceIds: [] });
  }
  return results;
}
