/**
 * Permanent CCQS CLI entry point — CCQS §11 (`PLAN/ccqs-architecture.md`). Replays the golden
 * dataset against the current Cognitive Engine, persists the run, prints the resulting
 * QualityMetricSnapshot and gate verdict. This is the tool a future engineer runs before/after any
 * Cognitive Engine change — not a scratchpad script.
 *
 * Run via: NODE_OPTIONS="--conditions=react-server" npm run ccqs:replay -- --label "my change"
 */
import { execSync } from 'child_process';
import { GOLDEN_DATASET_V1, GOLDEN_DATASET_REF } from '@/ccqs/golden-dataset';
import { currentEngineVersionManifest } from '@/ccqs/engine-version/current-engine-version';
import { runGoldenReplay } from '@/ccqs/replay/run-golden-replay';
import { readReplayRecords } from '@/ccqs/replay/read-replay-records';
import { aggregateQualityMetrics } from '@/ccqs/metrics/aggregate-quality-metrics';
import { evaluateGate } from '@/ccqs/gate/evaluate-gate';
import { DEFAULT_GATE_POLICY } from '@/ccqs/gate/default-gate-policy';
import { persistGateVerdict } from '@/ccqs/gate/persist-gate-verdict';
import { checkRunCompleteness } from '@/ccqs/gate/run-integrity';

function gitCommit(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function parseLabelArg(): string {
  const idx = process.argv.indexOf('--label');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return `manual-replay-${new Date().toISOString()}`;
}

async function main(): Promise<void> {
  const label = parseLabelArg();
  const now = new Date().toISOString();
  const engineVersion = currentEngineVersionManifest({ label, gitCommit: gitCommit(), now });

  console.log(`Running golden replay: "${label}"`);
  console.log('Engine version manifest:', JSON.stringify(engineVersion, null, 2));

  const { replayRunId, recordCount, skippedCaseIds } = await runGoldenReplay({
    engineVersion,
    dataset: GOLDEN_DATASET_V1,
    datasetRef: GOLDEN_DATASET_REF,
    triggeredBy: 'manual',
  });

  console.log(`\nReplayRun ${replayRunId}: ${recordCount} recorded, ${skippedCaseIds.length} skipped`);
  if (skippedCaseIds.length) console.log('Skipped case ids (pipeline returned null):', skippedCaseIds);

  // MEI-02 (RFC-005 §17 / CIF-INV-06): a run with undisclosed skips is not gate-worthy.
  // `--disclose-skips` acknowledges an incomplete run explicitly instead of silently gating on it.
  const completeness = checkRunCompleteness(skippedCaseIds, {
    disclosed: process.argv.includes('--disclose-skips'),
  });
  console.log(`\n[${completeness.meiId}] ${completeness.passed ? 'OK' : 'BLOCKED'}: ${completeness.detail}`);
  if (!completeness.passed) {
    console.error('\nGate evaluation refused (MEI-02). The ReplayRun and its records remain persisted for investigation.');
    process.exitCode = 2;
    return;
  }

  const records = await readReplayRecords(replayRunId);
  const metrics = aggregateQualityMetrics(replayRunId, records, new Date().toISOString());
  console.log('\n=== QualityMetricSnapshot ===');
  console.log(JSON.stringify(metrics, null, 2));

  const verdict = evaluateGate(metrics, DEFAULT_GATE_POLICY, { replayRunId, decidedAt: new Date().toISOString() });
  console.log('\n=== Gate Verdict (default-v1) ===');
  console.log(JSON.stringify(verdict, null, 2));

  // MEI-01 (RFC-005 §17, closes Conformance Audit debt T1): an unpersisted verdict is no verdict.
  const verdictRowId = await persistGateVerdict(verdict, DEFAULT_GATE_POLICY);
  console.log(`\n[MEI-01] Gate verdict persisted: CcqsGateVerdict ${verdictRowId}`);

  console.log(`\nreplayRunId=${replayRunId}`);
  if (verdict.verdict === 'fail') process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
