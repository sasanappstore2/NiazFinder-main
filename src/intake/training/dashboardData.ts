import { db } from '@/lib/db';
import { buildRejectAnalysisDashboard } from '@/ai/analytics/rejectAnalysis';
import {
  buildCandidateFailureStats,
  computeCandidateCoverageRate,
} from '@/ai/analytics/candidateFailures';
import { loadEvaluationLastRun } from '@/ai/evaluation/dashboardData';

export async function buildIntakeTrainingDashboard() {
  const [
    trainingCount,
    reviewedCount,
    pendingCount,
    rejectAnalysis,
    candidateFailures,
    coverage,
    recentExamples,
    lastEval,
  ] = await Promise.all([
    db.intakeTrainingExample.count(),
    db.intakeTrainingExample.count({ where: { reviewed: true } }),
    db.intakeTrainingExample.count({ where: { reviewed: false } }),
    buildRejectAnalysisDashboard(),
    buildCandidateFailureStats(24 * 7),
    computeCandidateCoverageRate(24 * 7),
    db.intakeTrainingExample.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sourceText: true,
        needType: true,
        ruleResult: true,
        aiResult: true,
        finalEntities: true,
        reviewed: true,
        reviewedBy: true,
        reviewedAt: true,
        correctedEntities: true,
        publishedAt: true,
        serviceRequestId: true,
      },
    }),
    Promise.resolve(loadEvaluationLastRun()),
  ]);

  return {
    counts: {
      trainingExamples: trainingCount,
      reviewedExamples: reviewedCount,
      pendingReview: pendingCount,
      goldDatasetSize: reviewedCount,
    },
    candidateCoverage: coverage,
    rejectAnalysis,
    candidateFailures,
    lastEvaluation: lastEval,
    examples: recentExamples,
  };
}

export type IntakeTrainingDashboardData = Awaited<
  ReturnType<typeof buildIntakeTrainingDashboard>
>;

export async function listTrainingExamples(options?: {
  reviewed?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where =
    options?.reviewed === undefined ? {} : { reviewed: options.reviewed };
  const [items, total] = await Promise.all([
    db.intakeTrainingExample.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    db.intakeTrainingExample.count({ where }),
  ]);
  return { items, total };
}

export async function reviewTrainingExample(input: {
  id: string;
  reviewedBy: string;
  markCorrect?: boolean;
  correctedEntities?: unknown;
}) {
  return db.intakeTrainingExample.update({
    where: { id: input.id },
    data: {
      reviewed: true,
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date(),
      correctedEntities: input.markCorrect
        ? undefined
        : (input.correctedEntities as object | undefined),
    },
  });
}
