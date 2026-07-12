/**
 * Phase 7 — shadow comparison between the legacy hybrid pipeline's published result and the
 * cognitive-engine pipeline run on the same source text. Observability only: this never changes
 * what gets published or what any user sees (mirrors the existing
 * `src/intake/legacy/compareLegacyAndCanonical.ts` shape and philosophy — log raw values on both
 * sides rather than collapsing to a bare boolean, so a human reviewing drift can judge fit).
 */
import type { NeedDraft } from '@/contracts/need-intake';
import type { CognitivePipelineResult } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';

export interface CognitiveShadowDiff {
  field: string;
  legacy: unknown;
  cognitiveEngine: unknown;
}

export interface CognitiveShadowComparison {
  equal: boolean;
  diffs: CognitiveShadowDiff[];
}

function findDecision(result: CognitivePipelineResult, domain: string) {
  return result.decisions.find((d) => d.domain === domain) ?? null;
}

export function compareCognitiveEngineResult(
  draft: NeedDraft,
  result: CognitivePipelineResult
): CognitiveShadowComparison {
  const diffs: CognitiveShadowDiff[] = [];

  // Category: compare by slug (Decision candidate `id` is the raw slug per
  // src/cognitive-engine/grounding/resolver.ts's groundCategory; `label` is the Persian title).
  const categoryDecision = findDecision(result, 'category');
  const legacyCategorySlug = draft.parsedIntent?.categorySlug ?? null;
  const cognitiveCategorySlug = categoryDecision?.preferred?.id ?? null;
  if (legacyCategorySlug !== cognitiveCategorySlug) {
    diffs.push({ field: 'categorySlug', legacy: legacyCategorySlug, cognitiveEngine: cognitiveCategorySlug });
  }

  // Location: intentionally approximate — the cognitive-engine label may be a combined
  // "neighborhood, city" string when a neighborhood was resolved. Both raw values are logged
  // regardless of match so a human can judge fit; this is not meant to be a strict equality gate.
  const locationDecision = findDecision(result, 'location');
  const legacyCity = draft.parsedIntent?.city ?? null;
  const cognitiveLocationLabel = locationDecision?.preferred?.label ?? null;
  const locationLooksEqual =
    legacyCity != null &&
    cognitiveLocationLabel != null &&
    cognitiveLocationLabel.includes(legacyCity);
  if (!locationLooksEqual) {
    diffs.push({ field: 'location', legacy: legacyCity, cognitiveEngine: cognitiveLocationLabel });
  }

  // Readiness: this draft already reached publish under the legacy pipeline, so the interesting
  // signal is whether cognitive-engine would have blocked it — e.g. it wanted a location or
  // category the legacy pipeline didn't require.
  if (!result.readiness.publicationReady) {
    diffs.push({
      field: 'readiness',
      legacy: 'published',
      cognitiveEngine: { level: result.readiness.level, blockingDomains: result.readiness.blockingDomains },
    });
  }

  return { equal: diffs.length === 0, diffs };
}
