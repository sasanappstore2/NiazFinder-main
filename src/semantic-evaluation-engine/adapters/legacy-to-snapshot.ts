/**
 * legacy-to-snapshot.ts — Step 3 of the approved SEE implementation order
 * (`PLAN/semantic-comparator-architecture.md` §5/§10/§12).
 *
 * Anti-Corruption Layer: translates the legacy hybrid pipeline's `NeedDraft` into a
 * `SemanticSnapshot`, structurally only. Per this round's explicit adapter principles, this file
 * must never interpret, infer, repair, execute business logic, or improve legacy output — every
 * mapping below is a direct, disclosed, mechanical read of a field already computed upstream by
 * the legacy pipeline. See `PLAN/phase7-drift-investigation-report.md` for the investigation this
 * whole component exists to support with trustworthy comparisons.
 *
 * PURITY: no `Date.now()`/`crypto.randomUUID()`/network/logging/caching. `snapshotId` and
 * `producedAt` are supplied by the caller — mirrors the exact pattern already used by
 * `runCognitivePipeline(rawText, { now })` elsewhere in this codebase, for the same determinism
 * reason (same input must always produce the same output).
 *
 * ONE-WAY: this file has exactly one direction (NeedDraft -> SemanticSnapshot) and never imports
 * anything from `@/cognitive-engine/**` or `@/semantic-evaluation-engine/adapters/cognitive-to-snapshot`.
 */
import type { NeedDraft } from '@/contracts/need-intake';
import type { SemanticFieldValue, SemanticSnapshot, SemanticValue } from '../types';

export const LEGACY_SOURCE_SYSTEM = 'legacy-hybrid-pipeline';
export const SEMANTIC_CONTRACT_VERSION = '1.0.0';

export interface LegacyToSnapshotOptions {
  snapshotId: string;
  producedAt: string;
}

function legacyCategoryField(draft: NeedDraft): SemanticFieldValue {
  const slug = draft.parsedIntent.categorySlug?.trim();
  const candidates = draft.parsedIntent.categoryCandidates ?? [];
  const fieldMetaEntry = draft.fieldMeta?.categorySlug;

  if (slug) {
    return {
      fieldId: 'category',
      state: 'resolved',
      value: { shape: 'scalar-ontology', ref: { namespace: 'category', id: slug } },
      // Per-field confidence ONLY — deliberately not falling back to the whole-parse
      // `parsedIntent.confidence` when a category-specific figure is absent. Substituting a
      // differently-scoped number as if it were this field's confidence would itself be exactly
      // the "normalize semantics beyond structural transformation" this round forbids. See the
      // Step 3 report's "Adapter Finding #3".
      confidence: typeof fieldMetaEntry?.confidence === 'number' ? fieldMetaEntry.confidence : null,
      provenance: {
        sourceSystem: LEGACY_SOURCE_SYSTEM,
        evidenceRefs: fieldMetaEntry?.evidence ? [fieldMetaEntry.evidence] : [],
        derivation: 'direct',
        // Not a meaningful check for an internal slug identifier (slugs are not natural-language
        // spans expected to appear verbatim in free text) — honestly null, not a fabricated check.
        rawInputContainsValue: null,
      },
    };
  }

  if (candidates.length > 0) {
    return {
      fieldId: 'category',
      state: 'ambiguous',
      value: null,
      // Known, disclosed loss: `categoryCandidates[].confidence` is discarded here — SemanticValue
      // has no per-item confidence slot today. See Step 3 report, "Potential Semantic Losses".
      candidates: candidates.map(
        (c): SemanticValue => ({ shape: 'scalar-ontology', ref: { namespace: 'category', id: c.slug } })
      ),
      confidence: null,
      provenance: { sourceSystem: LEGACY_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    };
  }

  return {
    fieldId: 'category',
    state: 'missing',
    value: null,
    confidence: null,
    provenance: { sourceSystem: LEGACY_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
  };
}

function legacyLocationField(draft: NeedDraft): SemanticFieldValue {
  const city = draft.parsedIntent.city?.trim();
  const fieldMetaEntry = draft.fieldMeta?.city;
  const cityCandidates = draft.parsedIntent.cityCandidates ?? [];
  const neighborhoodCandidates = draft.parsedIntent.neighborhoodCandidates ?? [];

  if (city) {
    // Purely structural, single-object substring check against THIS adapter's own single input
    // (NeedDraft carries both `parsedIntent.city` and `sourceText`) — no reference to the
    // cognitive-engine side, no NLP, no judgment about correctness. This is what lets the future
    // Comparator (Step 4) later distinguish "legacy resolved it structurally outside the text the
    // cognitive engine ever saw" from a genuine mismatch, without either adapter cross-referencing
    // the other's data. See Step 3 report, "Adapter Finding #1".
    const rawInputContainsValue = draft.sourceText.includes(city);
    return {
      fieldId: 'location',
      state: 'resolved',
      value: { shape: 'scalar-geo', ref: null, raw: city },
      confidence: typeof fieldMetaEntry?.confidence === 'number' ? fieldMetaEntry.confidence : null,
      provenance: {
        sourceSystem: LEGACY_SOURCE_SYSTEM,
        evidenceRefs: fieldMetaEntry?.evidence ? [fieldMetaEntry.evidence] : [],
        derivation: 'direct',
        rawInputContainsValue,
      },
    };
  }

  if (draft.parsedIntent.locationAmbiguous || cityCandidates.length > 0 || neighborhoodCandidates.length > 0) {
    const candidateValues: SemanticValue[] = [
      ...cityCandidates.map((c): SemanticValue => ({ shape: 'scalar-geo', ref: null, raw: c.label })),
      ...neighborhoodCandidates.map((c): SemanticValue => ({ shape: 'scalar-geo', ref: null, raw: c.label })),
    ];
    return {
      fieldId: 'location',
      state: 'ambiguous',
      value: null,
      // Known, disclosed loss: `cityCandidates[].score` is discarded here, same reason as category.
      candidates: candidateValues,
      confidence: null,
      provenance: { sourceSystem: LEGACY_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    };
  }

  return {
    fieldId: 'location',
    state: 'missing',
    value: null,
    confidence: null,
    provenance: { sourceSystem: LEGACY_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
  };
}

/** Pure: `draft` in, `SemanticSnapshot` out. No side effects, no I/O, no randomness. */
export function legacyDraftToSemanticSnapshot(draft: NeedDraft, opts: LegacyToSnapshotOptions): SemanticSnapshot {
  return {
    snapshotId: opts.snapshotId,
    sourceSystem: LEGACY_SOURCE_SYSTEM,
    producedAt: opts.producedAt,
    semanticContractVersion: SEMANTIC_CONTRACT_VERSION,
    fields: [legacyCategoryField(draft), legacyLocationField(draft)],
  };
}
