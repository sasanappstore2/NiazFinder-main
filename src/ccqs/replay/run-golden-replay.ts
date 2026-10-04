/**
 * runGoldenReplay — the Historical Replay Framework orchestrator, CCQS §4 (`PLAN/ccqs-architecture.md`).
 * Zero new comparison logic: every case is run through the real Cognitive Engine, adapted to a
 * `SemanticSnapshot` via SEE's own `cognitiveResultToSemanticSnapshot` (unchanged), compared
 * against a ground-truth `SemanticSnapshot` via SEE's own `compareSnapshots`/`applyScoringPolicy`
 * (unchanged). CCQS's only original contribution is orchestration + persistence + the rule-trace
 * capture SEE doesn't carry (§2 of the CCQS doc).
 *
 * Every `ComparisonRecord` this produces is Historical Record, inserted once, never updated
 * (mirrors SEE §16 — this file contains no UPDATE statement against comparison data anywhere).
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { runCognitivePipeline } from '@/cognitive-engine/pipeline/run-cognitive-pipeline';
import { matchCategoryCandidatesFromRules } from '@/intake/rules/registry.server';
import { cognitiveResultToSemanticSnapshot } from '@/semantic-evaluation-engine/adapters/cognitive-to-snapshot';
import { compareSnapshots } from '@/semantic-evaluation-engine/comparator/compare-snapshots';
import { applyScoringPolicy } from '@/semantic-evaluation-engine/policy/apply-scoring-policy';
import { DEFAULT_SCORING_POLICY } from '@/semantic-evaluation-engine/policy/default-policy';
import {
  SEE_FIELD_SPECS,
  SEE_ONTOLOGY_PROVIDERS,
  SEE_COMPARATOR_ENGINE_VERSION,
  SEE_EVALUATION_REPORT_VERSION,
} from '@/semantic-evaluation-engine/config';
import { goldenCaseToTruthSnapshot } from '../adapters/golden-case-to-snapshot';
import type { EngineVersionManifest, GoldenCase, RuleTraceEntry } from '../types';

export interface RunGoldenReplayOptions {
  engineVersion: EngineVersionManifest;
  dataset: readonly GoldenCase[];
  datasetRef: string;
  triggeredBy: 'manual' | 'ci' | 'scheduled';
}

export interface RunGoldenReplayResult {
  replayRunId: string;
  recordCount: number;
  skippedCaseIds: string[];
}

async function persistEngineVersion(manifest: EngineVersionManifest): Promise<string> {
  const row = await db.ccqsEngineVersion.create({
    data: {
      label: manifest.label,
      cognitiveEngineVersion: manifest.cognitiveEngineVersion,
      semanticContractVersion: manifest.semanticContractVersion,
      comparatorEngineVersion: manifest.comparatorEngineVersion,
      rulesRegistryVersion: manifest.rulesRegistryVersion,
      ontologyVersions: JSON.stringify(manifest.ontologyVersions),
      gitCommit: manifest.gitCommit,
    },
  });
  return row.id;
}

export async function runGoldenReplay(opts: RunGoldenReplayOptions): Promise<RunGoldenReplayResult> {
  const engineVersionId = await persistEngineVersion(opts.engineVersion);
  const replayRun = await db.ccqsReplayRun.create({
    data: {
      engineVersionId,
      datasetRef: opts.datasetRef,
      status: 'running',
      triggeredBy: opts.triggeredBy,
    },
  });

  const skippedCaseIds: string[] = [];
  let recordCount = 0;

  try {
    for (const goldenCase of opts.dataset) {
      if (goldenCase.deprecated) continue;

      const now = new Date().toISOString();
      let result;
      try {
        result = await runCognitivePipeline(goldenCase.rawText, { now });
      } catch (err) {
        console.error(`[ccqs-replay] pipeline error for case "${goldenCase.caseId}":`, err);
        result = null;
      }
      if (!result) {
        skippedCaseIds.push(goldenCase.caseId);
        continue;
      }

      const truthSnapshot = goldenCaseToTruthSnapshot(goldenCase, { snapshotId: randomUUID(), producedAt: now });
      const engineSnapshot = cognitiveResultToSemanticSnapshot(result, { snapshotId: randomUUID(), producedAt: now });

      const comparisonReport = compareSnapshots(truthSnapshot, engineSnapshot, {
        reportId: randomUUID(),
        comparedAt: now,
        fieldSpecs: SEE_FIELD_SPECS,
        ontologyProviders: SEE_ONTOLOGY_PROVIDERS,
        comparatorEngineVersion: SEE_COMPARATOR_ENGINE_VERSION,
      });

      const finalEvaluation = applyScoringPolicy(comparisonReport, DEFAULT_SCORING_POLICY, {
        evaluationId: randomUUID(),
        evaluationReportVersion: SEE_EVALUATION_REPORT_VERSION,
      });

      // CCQS-only data SEE doesn't carry (§2 of the CCQS doc) — a second, cheap, pure call.
      const categoryMatches = matchCategoryCandidatesFromRules(goldenCase.rawText, { limit: 5 });
      const ruleTrace: RuleTraceEntry[] = [
        { fieldId: 'category', matchedRuleIds: [...new Set(categoryMatches.flatMap((m) => m.matchedRules))] },
      ];

      await db.ccqsComparisonRecord.create({
        data: {
          replayRunId: replayRun.id,
          caseId: goldenCase.caseId,
          comparisonReport: JSON.stringify(comparisonReport),
          finalEvaluation: JSON.stringify(finalEvaluation),
          ruleTrace: JSON.stringify(ruleTrace),
        },
      });
      recordCount++;
    }

    await db.ccqsReplayRun.update({
      where: { id: replayRun.id },
      data: { status: 'completed', completedAt: new Date().toISOString() },
    });
  } catch (err) {
    await db.ccqsReplayRun.update({
      where: { id: replayRun.id },
      data: { status: 'failed', completedAt: new Date().toISOString() },
    });
    throw err;
  }

  return { replayRunId: replayRun.id, recordCount, skippedCaseIds };
}
