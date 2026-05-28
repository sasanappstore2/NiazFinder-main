import type { FieldSchema, ParsedIntent } from '@/contracts/need-intake';
import { getEffectiveIntakeSchema } from '@/lib/need-intake/essential-intake-schema';
import { isIntakeFieldAnswered } from '@/lib/need-intake/intake-field-answered';

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

/** Keys of visible intake fields not yet inferable from parse result. */
export function computeMissingIntakeFields(
  parsed: ParsedIntent,
  answers: Record<string, unknown> = {}
): string[] {
  const schema = getEffectiveIntakeSchema(
    parsed.intentType,
    parsed.categorySlug,
    parsed,
    answers
  );
  return schema.fields
    .filter((f) => fieldVisible(f, answers))
    .filter((f) => !isIntakeFieldAnswered(f, answers, parsed))
    .map((f) => f.key);
}
