/**
 * compareSnapshots — the Semantic Comparator (Layer 1) entry point. §1/§5/§6/§9/§10/§16
 * (`PLAN/semantic-comparator-architecture.md`).
 *
 * INV-01 deterministic, INV-02 never invokes AI, INV-03 never mutates inputs, INV-05 provider-
 * independent (providers injected, never imported by name), INV-06 operates only on
 * SemanticSnapshot (never imports NeedDraft/CognitivePipelineResult), INV-09 carries no weight or
 * business priority, INV-13 never branches on `sourceSystem`, INV-14 every reasonCode is
 * registry-validated, INV-15 this function computes a report — persisting/reading it is the
 * caller's separate concern (Step 6).
 *
 * PURITY: `reportId`/`comparedAt` are supplied by the caller — same pattern as the Step 3 adapters
 * and the existing `runCognitivePipeline(rawText, { now })` — no internal clock/randomness.
 */
import type {
  ComparisonReport,
  ComparisonStatus,
  FieldComparisonResult,
  FieldSpec,
  OntologyProvider,
  ScalarGeoValue,
  ScalarOntologyValue,
  SemanticFieldValue,
  SemanticSnapshot,
} from '../types';
import { evaluateStateCompatibility } from './state-compatibility';
import { compareScalarOntology } from './strategies/scalar-ontology';
import { compareScalarGeo } from './strategies/scalar-geo';
import { STATE_REASON_CODES, assertRegisteredReasonCode } from '../registry/reason-codes';
import type { StrategyOutcome } from './strategies/types';

export interface CompareSnapshotsOptions {
  reportId: string;
  comparedAt: string;
  /** Which fields to compare and how — the ONLY place field-specific configuration lives (§1). */
  fieldSpecs: FieldSpec[];
  /** Injected, keyed by namespace — never imported by concrete name (INV-05). */
  ontologyProviders: Record<string, OntologyProvider>;
  comparatorEngineVersion: string;
}

/** A field absent from a snapshot's `fields` array entirely is treated exactly as `state: 'unknown'`
 *  would be — honest and complete rather than silently omitted from the report (§9). */
function findFieldOrUnknown(snapshot: SemanticSnapshot, fieldId: string): SemanticFieldValue {
  const found = snapshot.fields.find((f) => f.fieldId === fieldId);
  if (found) return found;
  return {
    fieldId,
    state: 'unknown',
    value: null,
    confidence: null,
    provenance: { sourceSystem: snapshot.sourceSystem, evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null },
  };
}

function runStrategy(spec: FieldSpec, fieldA: SemanticFieldValue, fieldB: SemanticFieldValue, ontologyProviders: Record<string, OntologyProvider>): StrategyOutcome {
  if (spec.strategy.kind === 'scalar-ontology') {
    const provider = ontologyProviders[spec.strategy.ontologyNamespace];
    if (!provider) {
      throw new Error(`No OntologyProvider registered for namespace "${spec.strategy.ontologyNamespace}" (field "${spec.fieldId}")`);
    }
    const refA = (fieldA.value as ScalarOntologyValue).ref;
    const refB = (fieldB.value as ScalarOntologyValue).ref;
    return compareScalarOntology(refA, refB, provider);
  }
  if (spec.strategy.kind === 'scalar-geo') {
    return compareScalarGeo(fieldA.value as ScalarGeoValue, fieldB.value as ScalarGeoValue);
  }
  // set/range/graph strategies are explicitly NOT implemented (§11 non-goals) — no FieldSpec uses
  // them today, and inventing behavior for them now would be speculative, unvalidated building.
  throw new Error(`Comparison strategy "${spec.strategy.kind}" is not implemented yet (field "${spec.fieldId}")`);
}

function emptyCounts(): ComparisonReport['counts'] {
  return { comparable: 0, match: 0, refinement: 0, semanticEquivalent: 0, ambiguousButPlausible: 0, contradictionDetected: 0, mismatch: 0, notComparable: 0 };
}

function tally(results: FieldComparisonResult[]): ComparisonReport['counts'] {
  const counts = emptyCounts();
  for (const r of results) {
    if (r.status === 'not-comparable') {
      counts.notComparable++;
      continue;
    }
    counts.comparable++;
    const key: Record<Exclude<ComparisonStatus, 'not-comparable'>, keyof typeof counts> = {
      match: 'match',
      refinement: 'refinement',
      'semantic-equivalent': 'semanticEquivalent',
      'ambiguous-but-plausible': 'ambiguousButPlausible',
      'contradiction-detected': 'contradictionDetected',
      mismatch: 'mismatch',
    };
    counts[key[r.status as Exclude<ComparisonStatus, 'not-comparable'>]]++;
  }
  return counts;
}

export function compareSnapshots(
  snapshotA: SemanticSnapshot,
  snapshotB: SemanticSnapshot,
  opts: CompareSnapshotsOptions
): ComparisonReport {
  const fieldResults: FieldComparisonResult[] = [];
  const ontologyVersionsUsed: Record<string, string> = {};

  for (const spec of opts.fieldSpecs) {
    const fieldA = findFieldOrUnknown(snapshotA, spec.fieldId);
    const fieldB = findFieldOrUnknown(snapshotB, spec.fieldId);

    const prelim = evaluateStateCompatibility(fieldA, fieldB);
    const outcome: StrategyOutcome =
      prelim.kind === 'decided'
        ? { status: prelim.status, relationship: null, reasonCode: prelim.reasonCode, reasonParams: prelim.reasonParams }
        : runStrategy(spec, fieldA, fieldB, opts.ontologyProviders);

    if (spec.strategy.kind === 'scalar-ontology' && outcome.relationship) {
      const provider = opts.ontologyProviders[spec.strategy.ontologyNamespace];
      if (provider) ontologyVersionsUsed[provider.namespace] = provider.version;
    }

    assertRegisteredReasonCode(outcome.reasonCode);

    fieldResults.push({
      fieldId: spec.fieldId,
      status: outcome.status,
      snapshotAValue: fieldA,
      snapshotBValue: fieldB,
      relationship: outcome.relationship,
      reasonCode: outcome.reasonCode,
      reasonParams: outcome.reasonParams,
    });
  }

  return {
    reportId: opts.reportId,
    comparedAt: opts.comparedAt,
    snapshotAId: snapshotA.snapshotId,
    snapshotBId: snapshotB.snapshotId,
    versionStamp: {
      comparatorEngineVersion: opts.comparatorEngineVersion,
      semanticContractVersion: snapshotA.semanticContractVersion,
      ontologyVersions: ontologyVersionsUsed,
    },
    fieldResults,
    counts: tally(fieldResults),
  };
}

// Re-exported so a `STATE_REASON_CODES.NOT_YET_EVALUATED`-style reference works for callers
// building their own FieldSpec-adjacent tooling without reaching into the registry module.
export { STATE_REASON_CODES };
