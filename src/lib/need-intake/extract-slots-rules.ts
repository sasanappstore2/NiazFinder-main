import { parseMoneyInput } from '@/lib/format/money';
import type { ParsedIntent } from '@/contracts/need-intake';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';

function allowedKeys(intentType: ParsedIntent['intentType'], categorySlug: string): string[] {
  const schema = getSchemaForIntake(intentType, categorySlug);
  return schema.fields.map((f) => f.key);
}

const ENTITY_TO_SLOT: Record<string, string> = {
  dealType: 'dealType',
  propertyKind: 'propertyKind',
  vehicleKind: 'vehicleKind',
  roleType: 'roleType',
  serviceCategory: 'serviceCategory',
  socialType: 'socialType',
  projectName: 'projectName',
  brand: 'brand',
  model: 'model',
  condition: 'condition',
};

/** Rule-based slot hints from a single answer string. */
export function extractSlotsFromAnswer(
  fieldKey: string,
  value: string | number,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const text = String(value).trim();
  if (!text) return out;

  if (fieldKey === 'location' && !answers.location) {
    out.location = text;
  }
  if (fieldKey === 'budget' || fieldKey === 'rahnAmount' || fieldKey === 'monthlyRent') {
    const num = parseMoneyInput(text);
    if (num !== null && num > 0) out[fieldKey] = num;
  }
  return out;
}

function seedFromParsedEntities(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const keys = allowedKeys(parsed.intentType, parsed.categorySlug);
  const e = parsed.entities ?? {};

  for (const [entityKey, slotKey] of Object.entries(ENTITY_TO_SLOT)) {
    if (!keys.includes(slotKey)) continue;
    if (answers[slotKey] !== undefined && answers[slotKey] !== '') continue;
    const val = e[entityKey];
    if (val) merged[slotKey] = val;
  }

  if (keys.includes('budget') && !answers.budget && parsed.budgetMax) {
    merged.budget = parsed.budgetMax;
  }
  if (keys.includes('location') && !answers.location) {
    if (e.area && parsed.city) merged.location = `${e.area}، ${parsed.city}`;
    else if (parsed.city) merged.location = parsed.city;
    else if (e.area) merged.location = e.area;
  }
  if (keys.includes('rooms') && !answers.rooms && e.rooms) {
    merged.rooms = e.rooms;
  }
  if (keys.includes('areaMin') && !answers.areaMin && e.areaMin) {
    merged.areaMin = e.areaMin;
  }
  if (keys.includes('areaMax') && !answers.areaMax && e.areaMax) {
    merged.areaMax = e.areaMax;
  }
  if (keys.includes('rahnAmount') && !answers.rahnAmount && e.rahnAmount) {
    merged.rahnAmount = Number(e.rahnAmount);
  }
  if (keys.includes('deposit') && !answers.deposit && e.deposit) {
    merged.deposit = Number(e.deposit);
  }
  if (keys.includes('monthlyRent') && !answers.monthlyRent && e.monthlyRent) {
    merged.monthlyRent = Number(e.monthlyRent);
  }

  const slots = extractPropertySlotsFromText(parsed.rawText ?? '');
  if (keys.includes('areaMin') && !answers.areaMin && slots.areaMin) {
    merged.areaMin = Number(slots.areaMin);
  }
  if (keys.includes('rahnAmount') && !answers.rahnAmount && slots.rahnAmount) {
    merged.rahnAmount = Number(slots.rahnAmount);
  }
  if (keys.includes('monthlyRent') && !answers.monthlyRent && slots.monthlyRent) {
    merged.monthlyRent = Number(slots.monthlyRent);
  }

  return merged;
}

/** Map parsed entities + chip answers into schema slots — no LLM. */
export function extractSlotsFromRules(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  lastAnswer?: { fieldKey: string; value: string | number }
): Record<string, unknown> {
  const merged = seedFromParsedEntities(parsed, answers);

  if (lastAnswer) {
    Object.assign(
      merged,
      extractSlotsFromAnswer(lastAnswer.fieldKey, lastAnswer.value, {
        ...answers,
        ...merged,
      })
    );
    if (!merged[lastAnswer.fieldKey]) {
      merged[lastAnswer.fieldKey] = lastAnswer.value;
    }
  }

  const keys = allowedKeys(parsed.intentType, parsed.categorySlug);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (!keys.includes(k)) continue;
    if (answers[k] !== undefined && answers[k] !== '') continue;
    out[k] = v;
  }
  return out;
}
