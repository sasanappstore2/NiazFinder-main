import type { DatasetFixture, DatasetLabels, TrainingMessageRow } from './schema';
import { NEED_INTAKE_SYSTEM_PROMPT } from './schema';
import { cityToSlug } from './shared/normalize-city';

export function labelsToAssistantJson(labels: DatasetLabels): string {
  const citySlug = cityToSlug(labels.city);
  return JSON.stringify(
    {
      intentType: labels.intentType,
      categorySlug: labels.categorySlug,
      ...(labels.subcategorySlug ? { subcategorySlug: labels.subcategorySlug } : {}),
      entities: labels.entities,
      ...(citySlug ? { city: citySlug } : {}),
      ...(labels.budgetMin != null ? { budgetMin: labels.budgetMin } : {}),
      ...(labels.budgetMax != null ? { budgetMax: labels.budgetMax } : {}),
      ...(labels.urgency ? { urgency: labels.urgency } : {}),
      ...(labels.neighborhoodSlug ? { neighborhoodSlug: labels.neighborhoodSlug } : {}),
    },
    null,
    0
  );
}

export function buildTrainingRowFromFixture(fixture: DatasetFixture): TrainingMessageRow {
  return {
    messages: [
      { role: 'system', content: NEED_INTAKE_SYSTEM_PROMPT },
      { role: 'user', content: fixture.input.trim() },
      { role: 'assistant', content: labelsToAssistantJson(fixture.labels) },
    ],
  };
}

export function buildTrainingRowFromLabels(
  input: string,
  labels: DatasetLabels
): TrainingMessageRow {
  return buildTrainingRowFromFixture({ id: 'inline', input, labels });
}
