import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import {
  formatIssues,
  hasBlockingIssues,
  validateIntakeQuality,
  type QualityIssue,
} from '@/intake/intelligence-engine/fixtures/intake-quality-validator';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { isFieldFilled } from '@/intake/state/isFieldFilled';

export interface MarathonCaseInput {
  index: number;
  profile: CategoryTestProfile;
  text: string;
  source: 'gemma' | 'template' | 'divar';
}

export interface MarathonCaseResult {
  index: number;
  id: string;
  categorySlug: string;
  vertical: string;
  text: string;
  source: string;
  ok: boolean;
  latencyMs: number;
  resolvedCategory: string | null;
  resolvedCity: string | null;
  resolvedNeighborhood: string | null;
  templateId: string | null;
  aiInvoked: boolean;
  truthCorrected: string[];
  criticalFieldsExpected: string[];
  criticalFieldsFilled: string[];
  filterSuggestions: number;
  issues: QualityIssue[];
  ragDebug?: Record<string, unknown>;
  error?: string;
}

const NEIGHBORHOOD_MARKERS =
  /\u0632\u0639\u0641\u0631\u0627\u0646\u06CC\u0647|\u0646\u06CC\u0627\u0648\u0631\u0627\u0646|\u062C\u0631\u062F\u0646|\u0648\u0644\u0646\u062C\u06A9|\u0633\u0639\u0627\u062F\u062A\u0622\u0628\u0627\u062F|\u067E\u0648\u0646\u06A9|\u0648\u0646\u06A9|\u0641\u0631\u0645\u0627\u0646\u06CC\u0647|\u0627\u0644\u0647\u06CC\u0647|\u0627\u0642\u062F\u0633\u06CC\u0647|\u0634\u0631\u06CC\u0639\u062A\u06CC|\u062A\u062C\u0631\u06CC\u0634|\u067E\u0627\u0633\u062F\u0627\u0631\u0627\u0646|\u0645\u06CC\u0631\u062F\u0627\u0645\u0627\u062F|\u0642\u06CC\u0637\u0631\u06CC\u0647|\u06CC\u0648\u0633\u0641\u0622\u0628\u0627\u062F|\u0634\u0647\u0631\u064A\u063A\u0631\u0628|\u062A\u0647\u0631\u0627\u0646\u067E\u0627\u0631\u0633|\u0646\u0627\u0631\u0645\u0643|\u067E\u064A\u0631\u0648\u0632\u064A|\u0643\u0631\u062C|\u0634\u0627\u0647\u064A\u0646|\u06AF\u0648\u0647\u0631\u062F\u0634\u062A|\u0645\u0644\u0643\u0627\u0628\u0627\u062F|\u0627\u062D\u0645\u062F\u0622\u0628\u0627\u062F|\u0633\u062C\u0627\u062F|\u0641\u0631\u062F\u0648\u0633|\u0622\u0632\u0627\u062F\u0634\u0647\u0631|\u0647\u0641\u062A\u062A\u06CC\u0631|\u0639\u0628\u0627\u0633\u0622\u0628\u0627\u062F/u;

function resolvedCategorySlug(result: IntakeIntelligenceResult): string | null {
  const fromField =
    result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value;
  if (fromField) return String(fromField);
  return (
    result.draft.parsedIntent.subcategorySlug ??
    result.draft.parsedIntent.categorySlug ??
    null
  );
}

function textMentionsNeighborhood(text: string, hints?: string[]): boolean {
  if (NEIGHBORHOOD_MARKERS.test(text)) return true;
  if (!hints?.length) return false;
  return hints.some((h) => h.length >= 3 && text.includes(h.replace(/\s/g, '')) || text.includes(h));
}

function auditCriticalFields(result: IntakeIntelligenceResult): {
  expected: string[];
  filled: string[];
} {
  const entities = recordToEntities(result.draft.entities);
  const slug =
    entities.subcategorySlug ?? entities.categorySlug ?? result.draft.parsedIntent.categorySlug ?? '';
  const template = resolveTemplateFromDraftEntities(entities);
  const critical = getCriticalIntakeFields(template.id);
  const ctx = {
    entities,
    answers: result.draft.answers ?? {},
    selectedCategory: entities.categorySlug ?? undefined,
    selectedSubcategory: entities.subcategorySlug ?? undefined,
    selectedCity: entities.city ?? undefined,
    selectedNeighborhood: entities.neighborhood ?? undefined,
    sourceText: result.draft.sourceText,
    parsedBrand: result.draft.parsedIntent?.entities?.brand,
  };

  const filled: string[] = [];
  for (const key of critical) {
    const meta = template.fieldMap[key];
    if (meta && isFieldFilled(meta, ctx)) filled.push(key);
  }
  return { expected: critical, filled };
}

function buildRagDebug(
  result: IntakeIntelligenceResult,
  issues: QualityIssue[]
): Record<string, unknown> {
  const lowConf = Object.entries(result.trace.fieldMeta ?? {})
    .filter(([, v]) => v.confidence < 0.65)
    .map(([k, v]) => ({ field: k, confidence: v.confidence, source: v.source, value: v.value }));

  return {
    issues: formatIssues(issues),
    gaps: result.gaps.map((g) => ({ id: g.id, kind: g.kind, message: g.message })),
    lowConfidenceFields: lowConf,
    suggestedFilters: (result.suggestedFilters ?? []).slice(0, 8),
    engine: result.meta.engine,
    aiInvoked: result.meta.aiInvoked,
    truthCorrected: result.meta.truthVerifyCorrected ?? [],
    steps: result.trace.steps?.map((s) => `${s.name}:${s.durationMs}ms`) ?? [],
    normalizedText: result.trace.normalizedText?.slice(0, 200),
  };
}

export function evaluateMarathonCase(
  input: MarathonCaseInput,
  result: IntakeIntelligenceResult,
  latencyMs: number
): MarathonCaseResult {
  const issues = validateIntakeQuality(result, {
    text: input.text,
    profile: input.profile,
    latencyMs,
  });

  const resolved = resolvedCategorySlug(result);
  const city = result.fields.city?.value ? String(result.fields.city.value) : null;
  const neighborhood = result.fields.neighborhood?.value
    ? String(result.fields.neighborhood.value)
    : null;

  if (!resolved) {
    issues.push({
      code: 'missing_category',
      message: 'no category resolved',
      severity: 'error',
    });
  }

  if (textMentionsNeighborhood(input.text, input.profile.locationHints) && !neighborhood && !city) {
    issues.push({
      code: 'missing_neighborhood',
      message: 'text mentions neighborhood/area but location not resolved',
      severity: 'error',
    });
  } else if (textMentionsNeighborhood(input.text, input.profile.locationHints) && !neighborhood) {
    issues.push({
      code: 'missing_neighborhood',
      message: 'neighborhood mentioned but not extracted',
      severity: 'warn',
    });
  }

  const { expected, filled } = auditCriticalFields(result);
  const missingCritical = expected.filter((k) => !filled.includes(k));
  if (missingCritical.length > 0 && expected.length > 0) {
    issues.push({
      code: 'missing_critical_fields',
      message: `unfilled critical: ${missingCritical.join(', ')}`,
      severity: 'warn',
    });
  }

  const ok = !hasBlockingIssues(issues, false);
  const ragDebug = ok ? undefined : buildRagDebug(result, issues);

  return {
    index: input.index,
    id: input.profile.id,
    categorySlug: input.profile.categorySlug,
    vertical: input.profile.vertical,
    text: input.text,
    source: input.source,
    ok,
    latencyMs,
    resolvedCategory: resolved,
    resolvedCity: city,
    resolvedNeighborhood: neighborhood,
    templateId: result.draft.templateId ?? null,
    aiInvoked: Boolean(result.meta.aiInvoked),
    truthCorrected: result.meta.truthVerifyCorrected ?? [],
    criticalFieldsExpected: expected,
    criticalFieldsFilled: filled,
    filterSuggestions: result.suggestedFilters?.length ?? 0,
    issues,
    ragDebug,
  };
}

export function summarizeMarathonResults(results: MarathonCaseResult[]) {
  const failed = results.filter((r) => !r.ok);
  const issueCounts: Record<string, number> = {};
  for (const r of results) {
    for (const iss of r.issues) {
      issueCounts[iss.code] = (issueCounts[iss.code] ?? 0) + 1;
    }
  }
  const latencies = results.map((r) => r.latencyMs).filter((n) => n > 0).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    passRate: results.length ? (results.length - failed.length) / results.length : 0,
    aiInvoked: results.filter((r) => r.aiInvoked).length,
    categoryResolved: results.filter((r) => r.resolvedCategory).length,
    neighborhoodResolved: results.filter((r) => r.resolvedNeighborhood).length,
    latencyP50Ms: p50,
    latencyP95Ms: p95,
    issueCounts,
    topFailures: failed.slice(0, 20).map((r) => ({
      index: r.index,
      expected: r.categorySlug,
      resolved: r.resolvedCategory,
      city: r.resolvedCity,
      neighborhood: r.resolvedNeighborhood,
      issues: formatIssues(r.issues),
      text: r.text.slice(0, 100),
    })),
  };
}
