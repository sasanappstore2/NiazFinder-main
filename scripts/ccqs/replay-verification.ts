/**
 * Replay Verification — the first real, executable implementation of SEE §16.1's second
 * operation (INV-17), previously never exercised (Conformance Audit v1, finding D7):
 *
 *   "Re-run with the original pinned versions from the versionStamp; the freshly recomputed
 *    result is DIFFED against the stored value, then discarded or logged to a separate audit
 *    channel — it is NEVER written to the primary event store as a new historical entry."
 *
 * Scope — comparator-layer verification, exactly what the contract defines: the stored
 * ComparisonReport embeds both sides' full SemanticFieldValues, so the input snapshot pair is
 * reconstructed verbatim and compareSnapshots/applyScoringPolicy are re-executed. A divergence
 * is a DETERMINISM BUG (SEE INV-01/§16.4 — "not a reason to accept the new number"), and this
 * script exits non-zero on one. Engine-layer stability (re-running the LLM pipeline) is a
 * different capability — PVW §3's Replay Stability metric — deliberately not conflated here.
 *
 * Pinned-version precondition (SEE §16.5): re-running with TODAY's comparator/ontology only
 * satisfies "original pinned versions" when the stored versionStamp matches the current build.
 * Records whose stamp differs are reported as `version-vintage-mismatch` and skipped, never
 * silently verified against the wrong engine.
 *
 * Audit channel: a JSON report under reports/ (gitignored) + stdout. This script contains no
 * database write of any kind — grep it.
 *
 * Run via: npm run ccqs:verify-replay -- <replayRunId>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '@/lib/db';
import { compareSnapshots } from '@/semantic-evaluation-engine/comparator/compare-snapshots';
import { applyScoringPolicy } from '@/semantic-evaluation-engine/policy/apply-scoring-policy';
import { DEFAULT_SCORING_POLICY } from '@/semantic-evaluation-engine/policy/default-policy';
import {
  SEE_FIELD_SPECS,
  SEE_ONTOLOGY_PROVIDERS,
  SEE_COMPARATOR_ENGINE_VERSION,
  SEE_EVALUATION_REPORT_VERSION,
} from '@/semantic-evaluation-engine/config';
import { comparisonReportSchema, type ComparisonReport, type SemanticSnapshot } from '@/semantic-evaluation-engine/types';

/** Deterministic deep-stable stringify (sorted object keys) so diffs are order-insensitive. */
function stableStringify(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : val
  );
}

/** Reconstruct one side's SemanticSnapshot verbatim from the stored report's field values. */
function reconstructSnapshot(report: ComparisonReport, side: 'A' | 'B'): SemanticSnapshot {
  const fields = report.fieldResults.map((fr) => (side === 'A' ? fr.snapshotAValue : fr.snapshotBValue));
  return {
    snapshotId: side === 'A' ? report.snapshotAId : report.snapshotBId,
    // sourceSystem is provenance metadata the Comparator never branches on (INV-13); each stored
    // field value carries its own provenance verbatim, which is what the recomputation reads.
    sourceSystem: fields[0]?.provenance.sourceSystem ?? 'unknown',
    producedAt: report.comparedAt,
    semanticContractVersion: report.versionStamp.semanticContractVersion,
    fields,
  };
}

function currentOntologyVersions(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [ns, provider] of Object.entries(SEE_ONTOLOGY_PROVIDERS)) out[ns] = provider.version;
  return out;
}

interface RecordVerdict {
  caseId: string;
  outcome: 'identical' | 'divergent' | 'version-vintage-mismatch';
  detail?: string;
}

async function main(): Promise<void> {
  const replayRunId = process.argv[2];
  if (!replayRunId) {
    console.error('Usage: npm run ccqs:verify-replay -- <replayRunId>');
    process.exit(1);
  }

  const rows = await db.ccqsComparisonRecord.findMany({
    where: { replayRunId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (rows.length === 0) {
    console.error(`No comparison records found for ReplayRun ${replayRunId}`);
    process.exit(1);
  }
  console.log(`[replay-verification] ReplayRun ${replayRunId}: verifying ${rows.length} stored records (INV-17)`);

  const nowVersions = currentOntologyVersions();
  const verdicts: RecordVerdict[] = [];

  for (const row of rows) {
    const stored = comparisonReportSchema.parse(JSON.parse(row.comparisonReport));

    // Pinned-version precondition: only verify vintages the current build actually IS.
    const stamp = stored.versionStamp;
    const vintageOk =
      stamp.comparatorEngineVersion === SEE_COMPARATOR_ENGINE_VERSION &&
      Object.entries(stamp.ontologyVersions).every(([ns, v]) => nowVersions[ns] === v);
    if (!vintageOk) {
      verdicts.push({
        caseId: row.caseId,
        outcome: 'version-vintage-mismatch',
        detail: `stored=${stableStringify(stamp)} current={comparator:${SEE_COMPARATOR_ENGINE_VERSION}, ontologies:${stableStringify(nowVersions)}}`,
      });
      continue;
    }

    const snapshotA = reconstructSnapshot(stored, 'A');
    const snapshotB = reconstructSnapshot(stored, 'B');
    // Original reportId/comparedAt reused on purpose: with identical inputs and identical pinned
    // versions, the recomputed report must be BYTE-IDENTICAL (INV-01/INV-07), no field excluded.
    const recomputed = compareSnapshots(snapshotA, snapshotB, {
      reportId: stored.reportId,
      comparedAt: stored.comparedAt,
      fieldSpecs: SEE_FIELD_SPECS,
      ontologyProviders: SEE_ONTOLOGY_PROVIDERS,
      comparatorEngineVersion: SEE_COMPARATOR_ENGINE_VERSION,
    });

    const storedStr = stableStringify(stored);
    const recomputedStr = stableStringify(recomputed);
    if (storedStr === recomputedStr) {
      // Layer 2 as well — same discipline, same pinned-policy precondition.
      const storedEval = JSON.parse(row.finalEvaluation) as { versionStamp?: { scoringPolicyId?: string; scoringPolicyVersion?: string }; evaluationId?: string };
      const policyOk =
        storedEval.versionStamp?.scoringPolicyId === DEFAULT_SCORING_POLICY.policyId &&
        storedEval.versionStamp?.scoringPolicyVersion === DEFAULT_SCORING_POLICY.policyVersion;
      if (!policyOk) {
        verdicts.push({ caseId: row.caseId, outcome: 'version-vintage-mismatch', detail: 'scoring policy vintage differs from current build' });
        continue;
      }
      const recomputedEval = applyScoringPolicy(recomputed, DEFAULT_SCORING_POLICY, {
        evaluationId: storedEval.evaluationId ?? 'replay-verification',
        evaluationReportVersion: SEE_EVALUATION_REPORT_VERSION,
      });
      const evalIdentical = stableStringify(JSON.parse(row.finalEvaluation)) === stableStringify(recomputedEval);
      verdicts.push(
        evalIdentical
          ? { caseId: row.caseId, outcome: 'identical' }
          : { caseId: row.caseId, outcome: 'divergent', detail: 'Layer 1 identical; Layer 2 (FinalEvaluation) diverged' }
      );
    } else {
      // Name the first differing fieldResult for the audit record.
      let firstDiff = 'report-level difference';
      for (let i = 0; i < Math.max(stored.fieldResults.length, recomputed.fieldResults.length); i++) {
        if (stableStringify(stored.fieldResults[i]) !== stableStringify(recomputed.fieldResults[i])) {
          firstDiff = `fieldResults[${i}] (${stored.fieldResults[i]?.fieldId ?? '?'}): stored ${stored.fieldResults[i]?.status}/${stored.fieldResults[i]?.reasonCode} vs recomputed ${recomputed.fieldResults[i]?.status}/${recomputed.fieldResults[i]?.reasonCode}`;
          break;
        }
      }
      verdicts.push({ caseId: row.caseId, outcome: 'divergent', detail: firstDiff });
    }
  }

  const identical = verdicts.filter((v) => v.outcome === 'identical').length;
  const divergent = verdicts.filter((v) => v.outcome === 'divergent');
  const vintageMismatch = verdicts.filter((v) => v.outcome === 'version-vintage-mismatch').length;

  console.log(`\n=== Replay Verification result ===`);
  console.log(`identical: ${identical}/${rows.length}`);
  console.log(`version-vintage-mismatch (skipped, not verified): ${vintageMismatch}`);
  console.log(`DIVERGENT (determinism bug per SEE INV-01/§16.4): ${divergent.length}`);
  for (const d of divergent) console.log(`  ✗ ${d.caseId}: ${d.detail}`);

  // Separate audit channel (INV-17): file under reports/, NEVER the primary event store.
  const auditDir = join(process.cwd(), 'reports');
  mkdirSync(auditDir, { recursive: true });
  const auditPath = join(auditDir, `replay-verification-${replayRunId}-${Date.now()}.json`);
  writeFileSync(auditPath, JSON.stringify({ replayRunId, verifiedAt: new Date().toISOString(), comparatorEngineVersion: SEE_COMPARATOR_ENGINE_VERSION, totals: { records: rows.length, identical, divergent: divergent.length, vintageMismatch }, verdicts }, null, 2));
  console.log(`\nAudit record written (separate channel, not the event store): ${auditPath}`);

  await db.$disconnect();
  if (divergent.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
