import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import { getCategoryPath, isAncestorCategory } from '@/config/categories';
import { getEffectiveIntakeSchema } from '@/lib/need-intake/essential-intake-schema';
import { getNextQuestion } from '@/lib/need-intake/question-engine';

export interface QualityIssue {
  code: string;
  message: string;
  severity: 'error' | 'warn';
}

const CITY_MARKERS =
  /\u062A\u0647\u0631\u0627\u0646|\u0645\u0634\u0647\u062F|\u0627\u0635\u0641\u0647\u0627\u0646|\u0634\u06CC\u0631\u0627\u0632|\u062A\u0628\u0631\u06CC\u0632|\u0627\u0647\u0648\u0627\u0632|\u0642\u0645|\u0643\u0631\u062C|\u0631\u0634\u062A/u;

const NUMERIC_MONEY_IN_TEXT =
  /[\u0660-\u0669\u06F0-\u06F9\d][\d,\u0660-\u06F9]*\s*(?:\u0645\u06CC\u0644\u06CC\u0648\u0646|\u0645\u06CC\u0644\u06CC\u0627\u0631\u062F|\u0647\u0632\u0627\u0631|\u062A\u0648\u0645(?:\u0627\u0646|\u0646(?:\u0647)?|\u0645\u0646))/u;

const AREA_MARKERS =
  /[\u0660-\u06F9\d][\d,\u0660-\u06F9]*\s*\u0645\u062A\u0631(?:\u0627\u0698|\s|\u0645\u0631\u0628\u0639)?|(?:^|[\s?])??\s*\u0645\u062A\u0631/u;

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

function categoryMatchesExpected(resolved: string | null, expected: string): boolean {
  if (!resolved) return false;
  if (resolved === expected) return true;
  if (isAncestorCategory(expected, resolved) || isAncestorCategory(resolved, expected)) {
    return true;
  }
  const expPath = getCategoryPath(expected).map((c) => c.slug);
  const resPath = getCategoryPath(resolved).map((c) => c.slug);
  return expPath.some((s) => resPath.includes(s)) || resPath.some((s) => expPath.includes(s));
}

/** Strict quality gate for zero-defect intake+AI batches. */
export function validateIntakeQuality(
  result: IntakeIntelligenceResult,
  ctx: { text: string; profile: CategoryTestProfile; latencyMs: number }
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { text, profile, latencyMs } = ctx;

  if (latencyMs > 120_000) {
    issues.push({
      code: 'latency_exceeded',
      message: `latency ${latencyMs}ms > 120s`,
      severity: 'error',
    });
  }

  if (!result.draft?.templateId) {
    issues.push({ code: 'missing_template', message: 'no templateId on draft', severity: 'error' });
  }

  const contradictory = result.gaps.filter((g) => g.kind === 'contradictory');
  if (contradictory.length) {
    issues.push({
      code: 'contradictory_gaps',
      message: contradictory.map((g) => g.id).join(','),
      severity: 'error',
    });
  }

  const rahn = result.fields.rahnAmount?.value;
  const rent = result.fields.monthlyRent?.value;
  if (
    rahn != null &&
    rent != null &&
    Number(rahn) > 0 &&
    Number(rahn) === Number(rent)
  ) {
    issues.push({
      code: 'duplicate_money',
      message: `rahn=rent=${rahn}`,
      severity: 'error',
    });
  }

  const resolved = resolvedCategorySlug(result);
  if (!resolved) {
    issues.push({ code: 'missing_category', message: 'no category resolved', severity: 'error' });
  } else if (!categoryMatchesExpected(resolved, profile.categorySlug)) {
    const root = getCategoryPath(resolved)[0]?.slug;
    if (root !== profile.vertical) {
      issues.push({
        code: 'wrong_vertical',
        message: `expected ${profile.vertical} got ${root} (${resolved})`,
        severity: 'error',
      });
    } else {
      issues.push({
        code: 'category_mismatch',
        message: `expected ${profile.categorySlug} got ${resolved}`,
        severity: 'warn',
      });
    }
  }

  if (profile.vertical === 'real-estate') {
    const areaOptional = new Set([
      'construction-partnership',
      'pre-sale-services',
      'agency-services',
    ]);
    if (
      AREA_MARKERS.test(text) &&
      !areaOptional.has(profile.categorySlug) &&
      result.fields.area?.value == null
    ) {
      const areaInEntities = result.draft.answers?.areaMin ?? result.draft.entities?.areaMin;
      if (areaInEntities == null) {
        issues.push({
          code: 'missing_area',
          message: 'text mentions area but area not extracted',
          severity: 'error',
        });
      }
    }
    if (NUMERIC_MONEY_IN_TEXT.test(text)) {
      const entities = result.draft.entities ?? {};
      const answers = (result.draft.answers ?? {}) as Record<string, unknown>;
      const hasMoney =
        result.fields.rahnAmount?.value != null ||
        result.fields.monthlyRent?.value != null ||
        result.fields.budgetMax?.value != null ||
        result.fields.deposit?.value != null ||
        entities.nightlyRent != null ||
        answers.nightlyRent != null;
      if (!hasMoney) {
        issues.push({
          code: 'missing_money',
          message: 'text mentions money but no money field extracted',
          severity: 'error',
        });
      }
    }
  }

  if (CITY_MARKERS.test(text) && !result.fields.city?.value && profile.vertical === 'real-estate') {
    issues.push({
      code: 'missing_city',
      message: 'Iranian city in text but city not resolved',
      severity: 'warn',
    });
  }

  const intent = result.draft.parsedIntent;
  const answers = (result.draft.answers ?? {}) as Record<string, unknown>;
  const schemaSlug = String(intent.subcategorySlug ?? intent.categorySlug ?? resolved ?? profile.categorySlug);
  const schema = getEffectiveIntakeSchema(intent.intentType, schemaSlug, intent, answers);
  const allowedFields = new Set(schema.fields.map((f) => f.key));

  const nextQ = getNextQuestion(intent.intentType, intent, answers);
  if (!nextQ.done && nextQ.field?.key && !allowedFields.has(nextQ.field.key)) {
    issues.push({
      code: 'invalid_next_question',
      message: `nextQuestion field ${nextQ.field.key} not in schema for ${resolved}`,
      severity: 'error',
    });
  }

  if (result.draft.listingPreview?.title && result.draft.listingPreview.title.length < 4) {
    issues.push({
      code: 'empty_title',
      message: 'listing title too short',
      severity: 'error',
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: QualityIssue[], strict = false): boolean {
  if (strict) return issues.length > 0;
  return issues.some((i) => i.severity === 'error');
}

export function formatIssues(issues: QualityIssue[]): string {
  return issues.map((i) => `${i.severity}:${i.code}:${i.message}`).join('; ');
}
