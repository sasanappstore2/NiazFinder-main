import type { MarathonCaseResult } from './marathon-evaluator';
import { formatIssues } from '@/intake/intelligence-engine/fixtures/intake-quality-validator';

export interface BatchDiagnostic {
  batchIndex: number;
  size: number;
  passed: number;
  failed: number;
  passRate: number;
  issueCounts: Record<string, number>;
  categoryMismatches: Array<{
    expected: string;
    resolved: string | null;
    count: number;
    sampleText: string;
  }>;
  topFailures: Array<{
    index: number;
    categorySlug: string;
    resolvedCategory: string | null;
    issues: string;
    text: string;
  }>;
  recommendations: string[];
}

export function diagnoseBatch(
  batchIndex: number,
  results: MarathonCaseResult[]
): BatchDiagnostic {
  const failed = results.filter((r) => !r.ok);
  const issueCounts: Record<string, number> = {};
  for (const r of results) {
    for (const iss of r.issues) {
      issueCounts[iss.code] = (issueCounts[iss.code] ?? 0) + 1;
    }
  }

  const mismatchMap = new Map<string, { expected: string; resolved: string | null; count: number; sampleText: string }>();
  for (const r of failed) {
    if (r.resolvedCategory && r.resolvedCategory !== r.categorySlug) {
      const key = `${r.categorySlug}→${r.resolvedCategory}`;
      const prev = mismatchMap.get(key);
      if (prev) prev.count++;
      else mismatchMap.set(key, {
        expected: r.categorySlug,
        resolved: r.resolvedCategory,
        count: 1,
        sampleText: r.text.slice(0, 120),
      });
    } else if (!r.resolvedCategory) {
      const key = `${r.categorySlug}→null`;
      const prev = mismatchMap.get(key);
      if (prev) prev.count++;
      else mismatchMap.set(key, {
        expected: r.categorySlug,
        resolved: null,
        count: 1,
        sampleText: r.text.slice(0, 120),
      });
    }
  }

  const recommendations: string[] = [];
  if ((issueCounts.missing_category ?? 0) > 0) {
    recommendations.push('Add keyword rules for categories with missing_category failures');
  }
  if ((issueCounts.wrong_category ?? 0) > 0) {
    recommendations.push('Add negative rules or tighten keywords for wrong_category pairs');
  }
  if ((issueCounts.missing_neighborhood ?? 0) > 0) {
    recommendations.push('Improve location extraction for neighborhood mentions');
  }
  if ((issueCounts.missing_template ?? 0) > 0) {
    recommendations.push('Ensure template resolution after category match');
  }
  if ((issueCounts.latency_exceeded ?? 0) > 0) {
    recommendations.push('Increase NEED_INTAKE_LLM_TIMEOUT_MS or reduce parallel load');
  }

  return {
    batchIndex,
    size: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    passRate: results.length ? (results.length - failed.length) / results.length : 0,
    issueCounts,
    categoryMismatches: [...mismatchMap.values()].sort((a, b) => b.count - a.count),
    topFailures: failed.slice(0, 10).map((r) => ({
      index: r.index,
      categorySlug: r.categorySlug,
      resolvedCategory: r.resolvedCategory,
      issues: formatIssues(r.issues),
      text: r.text.slice(0, 160),
    })),
    recommendations,
  };
}
