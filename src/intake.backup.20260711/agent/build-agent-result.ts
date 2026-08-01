import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import { getIntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import type { FieldState } from '@/intake/intelligence-engine/types';
import {
  overallConfidenceFromScores,
  resolveFieldAction,
} from '@/intake/agent/confidence-policy';
import type {
  IntakeAgentFieldProjection,
  IntakeAgentResult,
  IntakeAgentSuggestedQuestion,
  IntakeAgentWarning,
} from '@/intake/agent/types';
import { validateAgentResult } from '@/intake/agent/validate-agent-result';

const FIELD_LABELS_FA: Record<string, string> = {
  categorySlug: 'دسته',
  subcategorySlug: 'زیردسته',
  vertical: 'حوزه',
  city: 'شهر',
  neighborhood: 'محله',
  transactionType: 'نوع معامله',
  dealType: 'نوع معامله',
  rahnAmount: 'رهن',
  monthlyRent: 'اجاره ماهانه',
  deposit: 'ودیعه',
  budgetMin: 'بودجه (حداقل)',
  budgetMax: 'بودجه (حداکثر)',
  rooms: 'اتاق',
  area: 'متراژ',
  propertyKind: 'نوع ملک',
};

const TRANSACTION_LABELS: Record<string, string> = {
  BUY: 'خرید',
  buy: 'خرید',
  SELL: 'فروش',
  sell: 'فروش',
  RENT: 'اجاره',
  rent: 'اجاره',
  rent_monthly: 'اجاره ماهانه',
  rent_rahn_full: 'رهن کامل',
  rent_rahn_ejare: 'رهن و اجاره',
  FULL_DEPOSIT: 'رهن کامل',
  DEPOSIT_AND_RENT: 'رهن و اجاره',
  DAILY_RENT: 'اجاره روزانه',
};

const DISPLAY_ORDER = [
  'categorySlug',
  'subcategorySlug',
  'transactionType',
  'city',
  'neighborhood',
  'area',
  'rooms',
  'rahnAmount',
  'monthlyRent',
  'deposit',
  'budgetMax',
  'budgetMin',
  'propertyKind',
] as const;

function formatDisplayValue(key: string, value: unknown): string {
  if (value == null || value === '') return '';
  if (key === 'categorySlug' || key === 'subcategorySlug') {
    return categorySuggestionLabelFromSlug(String(value).trim()) || String(value);
  }
  if (key === 'transactionType' || key === 'dealType') {
    const raw = String(value).trim();
    return TRANSACTION_LABELS[raw] ?? raw;
  }
  if (typeof value === 'number') {
    if (
      key.startsWith('budget') ||
      key === 'rahnAmount' ||
      key === 'monthlyRent' ||
      key === 'deposit'
    ) {
      return `${value.toLocaleString('fa-IR')} تومان`;
    }
    if (key === 'area') return `${value.toLocaleString('fa-IR')} متر`;
    return String(value);
  }
  return String(value).trim();
}

function projectFields(fieldMeta: Record<string, FieldState>): IntakeAgentFieldProjection[] {
  const out: IntakeAgentFieldProjection[] = [];
  const seen = new Set<string>();

  for (const key of DISPLAY_ORDER) {
    const meta = fieldMeta[key];
    if (!meta?.value && meta?.value !== 0) continue;
    const displayValue = formatDisplayValue(key, meta.value);
    if (!displayValue) continue;
    if (key === 'subcategorySlug' && fieldMeta.categorySlug?.value) {
      const catLabel = formatDisplayValue('categorySlug', fieldMeta.categorySlug.value);
      if (displayValue.includes(catLabel.split(' / ').pop() ?? '')) continue;
    }
    seen.add(key);
    out.push({
      key,
      label: FIELD_LABELS_FA[key] ?? key,
      value: meta.value,
      displayValue,
      confidence: meta.confidence ?? 0,
      source: meta.source,
      action: resolveFieldAction(meta.confidence ?? 0),
    });
  }

  for (const [key, meta] of Object.entries(fieldMeta)) {
    if (seen.has(key)) continue;
    if (!meta?.value && meta?.value !== 0) continue;
    if (key === 'citySlug' || key === 'neighborhoodSlug' || key === 'vertical') continue;
    const displayValue = formatDisplayValue(key, meta.value);
    if (!displayValue) continue;
    out.push({
      key,
      label: FIELD_LABELS_FA[key] ?? key,
      value: meta.value,
      displayValue,
      confidence: meta.confidence ?? 0,
      source: meta.source,
      action: resolveFieldAction(meta.confidence ?? 0),
    });
  }

  return out;
}

function buildSuggestedQuestions(
  result: IntakeIntelligenceResult,
  fields: IntakeAgentFieldProjection[]
): IntakeAgentSuggestedQuestion[] {
  const questions: IntakeAgentSuggestedQuestion[] = [];
  const seen = new Set<string>();

  for (const gap of result.gaps) {
    const fieldKey = gap.fieldKey ?? gap.id;
    if (!fieldKey || seen.has(fieldKey)) continue;
    if (gap.kind === 'missing' || gap.kind === 'uncertain') {
      seen.add(fieldKey);
      questions.push({
        fieldKey,
        questionFa: gap.messageFa ?? `${FIELD_LABELS_FA[fieldKey] ?? fieldKey} را مشخص کنید`,
        reason: gap.kind === 'uncertain' ? 'ambiguous' : 'missing',
      });
    }
  }

  for (const f of fields) {
    if (f.action !== 'ask') continue;
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    questions.push({
      fieldKey: f.key,
      questionFa: `${f.label} درست است؟ (${f.displayValue})`,
      reason: 'low_confidence',
    });
  }

  for (const m of result.missingFields) {
    const key = m.field;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    questions.push({
      fieldKey: key,
      questionFa: `${FIELD_LABELS_FA[key] ?? key} را مشخص کنید`,
      reason: 'missing',
    });
  }

  if (result.recommendedQuestions.length && questions.length === 0) {
    questions.push({
      fieldKey: result.nextQuestion?.fieldKey ?? 'general',
      questionFa: result.recommendedQuestions[0]!,
      reason: 'missing',
    });
  }

  return questions.slice(0, 6);
}

function synthesizeTitle(result: IntakeIntelligenceResult, categoryLabel: string | null): string {
  const gist = result.trace.intentGist?.trim();
  if (gist) return gist.slice(0, 80);
  const parts: string[] = [];
  if (categoryLabel) parts.push(categoryLabel);
  const city = result.fields.city?.value;
  if (city) parts.push(String(city));
  const area = result.fields.area?.value;
  if (area != null) parts.push(`${area} متر`);
  return parts.length ? parts.join(' · ') : 'نیاز شما';
}

/** Map intelligence engine output → product IntakeAgentResult (Mode A/B identical shape). */
export function buildIntakeAgentResult(result: IntakeIntelligenceResult): IntakeAgentResult {
  const analysisMode = getIntakeAnalysisMode();
  const fieldMeta = result.trace.fieldMeta;
  const fields = projectFields(fieldMeta);
  const categorySlug = String(
    result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value ?? ''
  ) || null;
  const categoryLabel = categorySlug
    ? categorySuggestionLabelFromSlug(categorySlug) || categorySlug
    : null;

  const confidenceScores = fields.map((f) => f.confidence);
  if (result.draft.completionScore > 0) {
    confidenceScores.push(result.draft.completionScore / 100);
  }
  const confidence = overallConfidenceFromScores(confidenceScores);

  const extractedEntities: Record<string, unknown> = {
    ...(result.draft.entities as Record<string, unknown>),
  };

  const base: IntakeAgentResult = {
    schemaVersion: 1,
    analysisMode,
    aiInvoked: result.meta.aiInvoked,
    confidence,
    title: synthesizeTitle(result, categoryLabel),
    description:
      result.trace.intentGist?.trim() ||
      (fields.length
        ? `به نظر می‌رسد ${fields
            .slice(0, 5)
            .map((f) => `${f.label}: ${f.displayValue}`)
            .join(' · ')} برای شما مهم است.`
        : 'متن نیاز را کامل‌تر بنویسید تا جزئیات استخراج شود.'),
    vertical: String(result.fields.vertical?.value ?? '') || null,
    categorySlug: String(result.fields.categorySlug?.value ?? '') || null,
    subcategorySlug: String(result.fields.subcategorySlug?.value ?? '') || null,
    categoryLabel,
    location: {
      city: (result.fields.city?.value as string | null) ?? null,
      citySlug: (result.fields.citySlug?.value as string | null) ?? null,
      neighborhood: (result.fields.neighborhood?.value as string | null) ?? null,
      neighborhoodSlug: (result.fields.neighborhoodSlug?.value as string | null) ?? null,
      province: (result.fields.province?.value as string | null) ?? null,
    },
    fields,
    extractedEntities,
    missingFields: result.missingFields,
    warnings: (result.validationWarnings ?? []) as IntakeAgentWarning[],
    suggestedQuestions: buildSuggestedQuestions(result, fields),
    categoryCandidates: result.categoryCandidates,
    gaps: result.gaps,
    draft: result.draft,
    fieldMeta,
    latencyMs: result.meta.latencyMs,
    engine: result.meta.engine,
  };

  return validateAgentResult(base);
}
