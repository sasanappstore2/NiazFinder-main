import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';
import type { FieldState, IntakeFieldBag } from '@/intake/intelligence-engine/types';

export interface CriticalFilterSuggestion {
  fieldKey: string;
  value: string | number | string[];
  labelFa: string;
  confidence: number;
  source: 'rules' | 'resolver' | 'ai';
}

const MIN_CONFIDENCE = 0.55;
const MAX_CHIPS_PER_FIELD = 3;

const BAG_KEY_MAP: Record<string, keyof IntakeFieldBag | string> = {
  city: 'city',
  dealType: 'dealType',
  transactionType: 'transactionType',
  budget: 'budgetMax',
  budgetMax: 'budgetMax',
  budgetMin: 'budgetMin',
  neighborhood: 'neighborhood',
  neighborhoodSlug: 'neighborhoodSlug',
  categorySlug: 'categorySlug',
  rooms: 'rooms',
  area: 'area',
  areaMin: 'area',
  brand: 'brand',
  deposit: 'rahnAmount',
  monthlyRent: 'monthlyRent',
  rahnAmount: 'rahnAmount',
};

function formatLabel(fieldKey: string, value: unknown, fieldLabel?: string): string {
  const base = fieldLabel ?? fieldKey;
  if (value == null || value === '') return base;
  if (Array.isArray(value)) return `${base}: ${value.join('، ')}`;
  if (typeof value === 'number') return `${base}: ${value}`;
  return `${base}: ${String(value)}`;
}

function bagField(bag: IntakeFieldBag, key: string): FieldState | undefined {
  return (bag as Record<string, FieldState | undefined>)[key];
}

function isAnswered(fieldKey: string, answers: Record<string, unknown>): boolean {
  const ans = answers[fieldKey];
  if (ans != null && ans !== '') return true;
  const altKey = BAG_KEY_MAP[fieldKey];
  if (altKey && altKey !== fieldKey) {
    const alt = answers[altKey];
    if (alt != null && alt !== '') return true;
  }
  return false;
}

function fieldLabelFor(slug: string, fieldKey: string): string | undefined {
  return getMergedFieldsForCategory(slug, 'need').find((f) => f.key === fieldKey)?.label;
}

function pushSuggestion(
  out: CriticalFilterSuggestion[],
  perField: Map<string, number>,
  item: CriticalFilterSuggestion
): void {
  const count = perField.get(item.fieldKey) ?? 0;
  if (count >= MAX_CHIPS_PER_FIELD) return;
  const dup = out.some(
    (s) => s.fieldKey === item.fieldKey && String(s.value) === String(item.value)
  );
  if (dup) return;
  if (item.confidence < MIN_CONFIDENCE) return;
  out.push(item);
  perField.set(item.fieldKey, count + 1);
}

/** Infer chip suggestions for critical optional filters — never writes answers. */
export function inferCriticalFilterSuggestions(input: {
  categorySlug: string | null | undefined;
  fieldBag: IntakeFieldBag;
  existingAnswers?: Record<string, unknown>;
}): CriticalFilterSuggestion[] {
  const slug = input.categorySlug;
  if (!slug) return [];

  const criticalKeys = getCriticalIntakeFields(slug);
  if (!criticalKeys.length) return [];

  const answers = input.existingAnswers ?? {};
  const bag = input.fieldBag;
  const out: CriticalFilterSuggestion[] = [];
  const perField = new Map<string, number>();

  for (const fieldKey of criticalKeys) {
    if (isAnswered(fieldKey, answers)) continue;

    const bagKey = BAG_KEY_MAP[fieldKey] ?? fieldKey;
    const state = bagField(bag, bagKey);
    if (state?.lockedByUser) continue;
    if (state?.value == null) continue;
    if ((state?.confidence ?? 0) < MIN_CONFIDENCE) continue;

    const label = fieldLabelFor(slug, fieldKey);
    const source: CriticalFilterSuggestion['source'] =
      state?.source === 'ai' ? 'ai' : state?.source === 'rule' ? 'rules' : 'resolver';

    pushSuggestion(out, perField, {
      fieldKey,
      value: state!.value as string | number | string[],
      labelFa: formatLabel(fieldKey, state!.value, label),
      confidence: state!.confidence ?? 0.6,
      source,
    });
  }

  return out;
}

export function criticalSuggestionsToChips(
  suggestions: CriticalFilterSuggestion[]
): Record<string, Array<{ value: string; label: string; confidence?: number }>> {
  const map: Record<string, Array<{ value: string; label: string; confidence?: number }>> = {};
  for (const s of suggestions) {
    const value =
      typeof s.value === 'number'
        ? String(s.value)
        : Array.isArray(s.value)
          ? s.value.join(',')
          : String(s.value);
    if (!map[s.fieldKey]) map[s.fieldKey] = [];
    map[s.fieldKey]!.push({
      value,
      label: s.labelFa,
      confidence: s.confidence,
    });
  }
  return map;
}
