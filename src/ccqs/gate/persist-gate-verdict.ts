/**
 * I/O boundary: persists Release Gate verdicts — closes Conformance Audit v1's finding D1/debt T1
 * ("gate verdicts, the most decision-bearing artifact in the system, are persisted nowhere
 * structured") and brings CGP MEI-01 online ("APPROVED requires a persisted GateVerdict row —
 * an unpersisted verdict is no verdict", RFC-005 §17).
 *
 * Kept separate from the pure `evaluateGate` on purpose (CCQS's "pure computation, I/O is the
 * caller's job" discipline): evaluate-gate.ts stays deterministic and I/O-free; this module is
 * the only writer of CcqsGatePolicy/CcqsGateVerdict rows.
 *
 * Append-only discipline (CCQS §9, SEE §14.4): a policy row is created once per
 * (policyId, policyVersion) and never updated — `thresholds` are frozen at first persistence,
 * mirroring SEE's immutable-once-published ScoringPolicy rule. Verdict rows are only ever
 * inserted. There is no UPDATE statement in this file, and there must never be one.
 */
import { db } from '@/lib/db';
import type { GateVerdict, QualityGatePolicy } from '../types';

/**
 * Get-or-create the policy row for a (policyId, policyVersion) pair. If the row already exists,
 * the in-code thresholds are compared against the frozen persisted ones — a mismatch means
 * someone edited an already-published policy version in place (forbidden by CCQS §1.6 / CGP
 * MEI-11), and this fails loudly rather than silently persisting a verdict against a policy row
 * that no longer matches the code that produced it.
 */
export async function ensureGatePolicyPersisted(policy: QualityGatePolicy): Promise<string> {
  const existing = await db.ccqsGatePolicy.findUnique({
    where: { policyId_policyVersion: { policyId: policy.policyId, policyVersion: policy.policyVersion } },
  });
  if (existing) {
    const persistedThresholds = JSON.stringify(JSON.parse(existing.thresholds));
    const codeThresholds = JSON.stringify(policy.thresholds);
    if (persistedThresholds !== codeThresholds) {
      throw new Error(
        `[ccqs-gate] Policy ${policy.policyId}@${policy.policyVersion} exists with DIFFERENT thresholds than the code's. ` +
          `A published policy version is immutable (CCQS §1.6) — changing thresholds requires a new policyVersion. ` +
          `Persisted: ${persistedThresholds} Code: ${codeThresholds}`
      );
    }
    return existing.id;
  }
  const row = await db.ccqsGatePolicy.create({
    data: {
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      thresholds: JSON.stringify(policy.thresholds),
      isActive: policy.isActive,
    },
  });
  return row.id;
}

/** Inserts the verdict row (append-only) and returns its id. */
export async function persistGateVerdict(verdict: GateVerdict, policy: QualityGatePolicy): Promise<string> {
  const gatePolicyRowId = await ensureGatePolicyPersisted(policy);
  const row = await db.ccqsGateVerdict.create({
    data: {
      replayRunId: verdict.replayRunId,
      gatePolicyId: gatePolicyRowId,
      verdict: verdict.verdict,
      reasons: JSON.stringify(verdict.reasons),
      decidedAt: verdict.decidedAt,
    },
  });
  return row.id;
}
