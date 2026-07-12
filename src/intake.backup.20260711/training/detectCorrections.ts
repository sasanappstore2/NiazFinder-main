import type { FieldChangeEvent, PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { CorrectionResult, FieldCorrection, IntakeAnalysisSnapshot } from '@/intake/training/types';

const TRACKED_ENTITY_KEYS = [
  'categorySlug',
  'subcategorySlug',
  'city',
  'citySlug',
  'neighborhood',
  'neighborhoodSlug',
  'transactionType',
  'budgetMin',
  'budgetMax',
] as const;

const TELEMETRY_FIELD_MAP: Record<string, string> = {
  categorySlug: 'categorySlug',
  subcategorySlug: 'subcategorySlug',
  city: 'city',
  neighborhood: 'neighborhood',
  neighborhoodSlug: 'neighborhoodSlug',
};

function isCorrectionValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim().toLowerCase();
  return JSON.stringify(value);
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  return normValue(a) !== normValue(b);
}

function predictedFromFieldMeta(
  fieldMeta: Record<string, FieldState> | undefined,
  key: string
): unknown {
  const state = fieldMeta?.[key];
  if (!state) return null;
  return state.value ?? null;
}

function correctionsFromTelemetry(
  events: PostIntakeEvent[]
): Map<string, { predicted: unknown; final: unknown }> {
  const map = new Map<string, { predicted: unknown; final: unknown }>();
  for (const event of events) {
    if (event.type !== 'field_change') continue;
    const fc = event as FieldChangeEvent;
    const entityKey = TELEMETRY_FIELD_MAP[fc.fieldKey];
    if (!entityKey) continue;
    if (!isCorrectionValue(fc.changedFrom) || !valuesDiffer(fc.changedFrom, fc.changedTo)) {
      continue;
    }
    map.set(entityKey, { predicted: fc.changedFrom, final: fc.changedTo });
  }
  return map;
}

function buildQualityFlags(
  correctionFields: string[],
  snapshot?: IntakeAnalysisSnapshot
): string[] {
  const flags: string[] = [];
  if (snapshot?.aiInvoked) flags.push('ai_invoked');
  if (correctionFields.some((f) => f.includes('category'))) {
    flags.push('user_corrected_category');
  }
  if (correctionFields.includes('city') || correctionFields.includes('citySlug')) {
    flags.push('user_corrected_city');
  }
  if (
    correctionFields.includes('neighborhood') ||
    correctionFields.includes('neighborhoodSlug')
  ) {
    flags.push('user_corrected_neighborhood');
  }
  const catConf = snapshot?.fieldMeta?.categorySlug?.confidence ?? 1;
  if (catConf < 0.5) flags.push('low_confidence_category');
  if (correctionFields.length > 0) flags.push('human_verified');
  return flags;
}

export function detectCorrections(input: {
  finalEntities: Record<string, unknown>;
  analysisSnapshot?: IntakeAnalysisSnapshot;
  fieldMeta?: Record<string, { value?: unknown; source?: string }>;
  telemetryEvents?: PostIntakeEvent[];
}): CorrectionResult {
  const fieldMeta = input.analysisSnapshot?.fieldMeta ?? (input.fieldMeta as Record<string, FieldState>);
  const telemetryMap = correctionsFromTelemetry(input.telemetryEvents ?? []);
  const correctionMap = new Map<string, FieldCorrection>();

  for (const key of TRACKED_ENTITY_KEYS) {
    const predicted = predictedFromFieldMeta(fieldMeta, key);
    const final = input.finalEntities[key] ?? null;
    const telemetry = telemetryMap.get(key);

    if (telemetry && valuesDiffer(telemetry.predicted, telemetry.final)) {
      correctionMap.set(key, {
        field: key,
        predicted: telemetry.predicted,
        final: telemetry.final,
        source: valuesDiffer(predicted, final) ? 'both' : 'telemetry',
      });
      continue;
    }

    if (isCorrectionValue(predicted) && valuesDiffer(predicted, final)) {
      correctionMap.set(key, {
        field: key,
        predicted,
        final,
        source: 'fieldMeta',
      });
    }
  }

  const corrections = [...correctionMap.values()];
  const correctionFields = corrections.map((c) => c.field);
  const correctedEntities: Record<string, unknown> = { ...input.finalEntities };
  for (const c of corrections) {
    correctedEntities[c.field] = c.final;
  }

  return {
    corrections,
    correctionFields,
    hasUserCorrections: corrections.length > 0,
    correctedEntities,
    qualityFlags: buildQualityFlags(correctionFields, input.analysisSnapshot),
  };
}
