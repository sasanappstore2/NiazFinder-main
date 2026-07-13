import type { IntakeTemplate } from '@/intake/template/types';
import type { DriftSignal, FieldStats } from '@/intake/intelligence/types';
import type { SessionAggregationResult } from '@/intake/intelligence/types';

export interface DriftDetectorInput {
  template: IntakeTemplate;
  fieldStats: Record<string, FieldStats>;
  aggregation: SessionAggregationResult;
  observedFieldKeys: readonly string[];
}

function schemaFieldKeys(template: IntakeTemplate): Set<string> {
  const keys = new Set<string>();
  for (const key of Object.keys(template.fieldMap)) keys.add(key);
  for (const section of template.sections) {
    for (const field of section.fields) keys.add(field);
  }
  for (const field of template.requiredFields) keys.add(field);
  for (const field of template.optionalFields) keys.add(field);
  return keys;
}

export function detectDrift(input: DriftDetectorInput): DriftSignal[] {
  const { template, fieldStats, aggregation, observedFieldKeys } = input;
  const schemaKeys = schemaFieldKeys(template);
  const required = new Set(template.rules.publish.requiredFields);
  const signals: DriftSignal[] = [];

  for (const fieldKey of observedFieldKeys) {
    if (schemaKeys.has(fieldKey)) continue;
    const stats = fieldStats[fieldKey];
    const usageRate = stats?.usageRate ?? 0;
    if (usageRate < 0.05) continue;

    const changeCount = aggregation.globalFieldChanges.get(fieldKey) ?? 0;
    signals.push({
      type: 'MISSING_FIELD',
      severity: usageRate >= 0.15 ? 'high' : 'medium',
      fieldKey,
      templateId: template.id,
      evidence: [
        `${changeCount} field_change events`,
        `usageRate ${(usageRate * 100).toFixed(1)}%`,
        'field not defined in template schema',
      ],
    });
  }

  for (const fieldKey of schemaKeys) {
    if (required.has(fieldKey)) continue;
    const stats = fieldStats[fieldKey];
    const usageRate = stats?.usageRate ?? 0;
    if (usageRate >= 0.02) continue;

    signals.push({
      type: 'DEAD_FIELD',
      severity: 'medium',
      fieldKey,
      templateId: template.id,
      evidence: [
        `usageRate ${(usageRate * 100).toFixed(1)}%`,
        `${stats?.changeCount ?? 0} field_change events`,
        'optional schema field with near-zero usage',
      ],
    });
  }

  for (const fieldKey of required) {
    const stats = fieldStats[fieldKey];
    const errorRate = stats?.errorRate ?? 0;
    const missingCount = aggregation.missingRequiredFieldCounts.get(fieldKey) ?? 0;
    if (errorRate < 0.2 && missingCount < 2) continue;

    signals.push({
      type: 'UX_MISMATCH',
      severity: 'high',
      fieldKey,
      templateId: template.id,
      evidence: [
        `errorRate ${(errorRate * 100).toFixed(1)}%`,
        `${missingCount} publish failures citing missing field`,
        'required/publish rule field with high friction',
      ],
    });
  }

  return signals;
}
