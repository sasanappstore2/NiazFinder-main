/**
 * goldenCaseToTruthSnapshot — CCQS's ground-truth adapter. Mirrors the structure of SEE's own
 * `legacyDraftToSemanticSnapshot`/`cognitiveResultToSemanticSnapshot`
 * (`src/semantic-evaluation-engine/adapters/`) so ground truth is JUST ANOTHER `SemanticSnapshot`
 * — SEE's `compareSnapshots` never needs to know it's comparing against curated truth rather than
 * a second engine's output. Same purity discipline as SEE's adapters: no internal clock/randomness,
 * `snapshotId`/`producedAt` supplied by the caller.
 */
import type { SemanticFieldValue, SemanticSnapshot } from '@/semantic-evaluation-engine/types';
import type { GoldenCase } from '../types';

export const GOLDEN_TRUTH_SOURCE_SYSTEM = 'golden-truth';
export const SEMANTIC_CONTRACT_VERSION = '1.0.0';

function categoryField(goldenCase: GoldenCase): SemanticFieldValue {
  if (!goldenCase.expectedCategory) {
    return {
      fieldId: 'category',
      state: 'missing',
      value: null,
      confidence: null,
      provenance: { sourceSystem: GOLDEN_TRUTH_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    };
  }
  return {
    fieldId: 'category',
    state: 'resolved',
    value: { shape: 'scalar-ontology', ref: { namespace: 'category', id: goldenCase.expectedCategory } },
    confidence: 1,
    provenance: { sourceSystem: GOLDEN_TRUTH_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
  };
}

function locationField(goldenCase: GoldenCase): SemanticFieldValue {
  if (!goldenCase.expectedLocationCity) {
    return {
      fieldId: 'location',
      state: 'missing',
      value: null,
      confidence: null,
      provenance: { sourceSystem: GOLDEN_TRUTH_SOURCE_SYSTEM, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
    };
  }
  return {
    fieldId: 'location',
    state: 'resolved',
    value: { shape: 'scalar-geo', ref: null, raw: goldenCase.expectedLocationCity },
    confidence: 1,
    provenance: {
      sourceSystem: GOLDEN_TRUTH_SOURCE_SYSTEM,
      evidenceRefs: [],
      derivation: 'direct',
      rawInputContainsValue: goldenCase.rawText.includes(goldenCase.expectedLocationCity),
    },
  };
}

export interface GoldenCaseToSnapshotOptions {
  snapshotId: string;
  producedAt: string;
}

export function goldenCaseToTruthSnapshot(goldenCase: GoldenCase, opts: GoldenCaseToSnapshotOptions): SemanticSnapshot {
  return {
    snapshotId: opts.snapshotId,
    sourceSystem: GOLDEN_TRUTH_SOURCE_SYSTEM,
    producedAt: opts.producedAt,
    semanticContractVersion: SEMANTIC_CONTRACT_VERSION,
    fields: [categoryField(goldenCase), locationField(goldenCase)],
  };
}
