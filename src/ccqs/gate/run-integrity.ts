/**
 * Run-integrity guards — pure, deterministic, no I/O (CCQS's pure-function discipline).
 * Implements the two machine-enforceable invariants the Replay Determinism Audit (§3) found
 * missing and CGP (RFC-005 §17) legislated:
 *
 *  - MEI-02: a ReplayRun grounding a gate claim must have zero skipped cases, OR the skip list
 *    must be explicitly disclosed by the caller. "A run with an incomplete or drifted input set
 *    is not distinguished from a clean one" was the audit's central finding — this is the
 *    distinguisher. (CIF-INV-06 / RFC-004 §26.)
 *
 *  - MEI-03: a VersionComparisonReport is only meaningful between runs with identical
 *    datasetRef — across a dataset change, accuracy numbers are non-comparable and the baseline
 *    must be re-established (CIF-INV-07 / RFC-004 §26 / CIF §34 sequencing).
 *
 * These guards REPORT; the calling CLI decides how to fail. They never throw — a guard that
 * throws inside a metrics pipeline would conflate "the run is dirty" with "the tooling crashed",
 * and the whole point is to make dirtiness a first-class, visible outcome.
 */

export interface RunIntegrityCheck {
  meiId: 'MEI-02' | 'MEI-03';
  passed: boolean;
  detail: string;
}

/** MEI-02 — skipped cases must be zero or explicitly disclosed. */
export function checkRunCompleteness(
  skippedCaseIds: readonly string[],
  opts?: { disclosed?: boolean }
): RunIntegrityCheck {
  if (skippedCaseIds.length === 0) {
    return { meiId: 'MEI-02', passed: true, detail: 'Run is complete: 0 skipped cases.' };
  }
  if (opts?.disclosed) {
    return {
      meiId: 'MEI-02',
      passed: true,
      detail: `Run has ${skippedCaseIds.length} skipped case(s) [${skippedCaseIds.join(', ')}] — explicitly disclosed by the caller; every ratio metric's denominator excludes them.`,
    };
  }
  return {
    meiId: 'MEI-02',
    passed: false,
    detail: `Run has ${skippedCaseIds.length} UNDISCLOSED skipped case(s) [${skippedCaseIds.join(', ')}]. A gate verdict over an incomplete run is not gate-worthy (Replay Determinism Audit §3). Re-run cleanly, or pass --disclose-skips to acknowledge the reduced population.`,
  };
}

/** MEI-03 — the two compared runs must have been produced against the same dataset. */
export function checkDatasetRefEquality(datasetRefA: string, datasetRefB: string): RunIntegrityCheck {
  if (datasetRefA === datasetRefB) {
    return { meiId: 'MEI-03', passed: true, detail: `Both runs use datasetRef "${datasetRefA}" — deltas are comparable.` };
  }
  return {
    meiId: 'MEI-03',
    passed: false,
    detail: `datasetRef mismatch: "${datasetRefA}" vs "${datasetRefB}". Accuracy deltas across different datasets are NON-COMPARABLE (CIF-INV-07); re-baseline the unchanged engine against the new dataset first (CIF §34), then compare within one datasetRef.`,
  };
}
