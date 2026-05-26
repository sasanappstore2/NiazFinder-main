import type { FieldSchema, ParsedIntent } from '@/contracts/need-intake';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';

function fieldVisible(field: FieldSchema, answers: Record<string, unknown>): boolean {
  if (field.showIf) {
    return String(answers[field.showIf.field]) === field.showIf.equals;
  }
  if (field.showIfIn) {
    const val = String(answers[field.showIfIn.field] ?? '');
    return field.showIfIn.values.includes(val);
  }
  return true;
}

function isFieldAnswered(
  field: FieldSchema,
  answers: Record<string, unknown>,
  parsed: ParsedIntent
): boolean {
  const val = answers[field.key];
  if (val !== undefined && val !== null && val !== '') return true;

  const e = parsed.entities ?? {};

  if (field.key === 'dealType' && (answers.dealType || e.dealType)) return true;
  if (field.key === 'propertyKind' && e.propertyKind) return true;
  if (field.key === 'budget' && (parsed.budgetMax || parsed.budgetMin)) return true;
  if (field.key === 'rahnAmount' && parsed.budgetMax && e.dealType?.includes('rahn')) {
    return true;
  }
  if (field.key === 'deposit' && answers.deposit) return true;
  if (field.key === 'monthlyRent' && answers.monthlyRent) return true;
  if (field.key === 'location' && (parsed.city || answers.location || e.area)) return true;
  if (field.key === 'rooms' && answers.rooms) return true;
  if (field.key === 'areaMin' && answers.areaMin) return true;
  if (field.key === 'amenities' && answers.amenities) return true;

  return false;
}

/** Keys of visible intake fields not yet inferable from parse result. */
export function computeMissingIntakeFields(
  parsed: ParsedIntent,
  answers: Record<string, unknown> = {}
): string[] {
  const schema = getSchemaForIntake(parsed.intentType, parsed.categorySlug);
  return schema.fields
    .filter((f) => fieldVisible(f, answers))
    .filter((f) => !isFieldAnswered(f, answers, parsed))
    .map((f) => f.key);
}
