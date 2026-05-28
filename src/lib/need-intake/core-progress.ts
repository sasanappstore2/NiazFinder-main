import type { ParsedIntent } from '@/contracts/need-intake';
import { getEffectiveIntakeSchema } from '@/lib/need-intake/essential-intake-schema';
import { getNextQuestion } from '@/lib/need-intake/question-engine';

function fieldVisible(
  field: { showIf?: { field: string; equals: string }; showIfIn?: { field: string; values: string[] } },
  answers: Record<string, unknown>
): boolean {
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
  key: string,
  answers: Record<string, unknown>,
  parsed: ParsedIntent
): boolean {
  const val = answers[key];
  if (val !== undefined && val !== null && val !== '') return true;
  if (key === 'budget' && (parsed.budgetMax || parsed.budgetMin)) return true;
  if (key === 'location' && (parsed.city || answers.location)) return true;
  if (key === 'phone' || key === 'contact') {
    return Boolean(answers._leadPhone);
  }
  return false;
}

/** Count required schema fields that have answers. */
export function countAnsweredRequiredFields(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): number {
  const schema = getEffectiveIntakeSchema(
    parsed.intentType,
    parsed.categorySlug,
    parsed,
    answers
  );
  const required = schema.fields.filter(
    (f) => f.required && fieldVisible(f, answers)
  );
  return required.filter((f) => isFieldAnswered(f.key, answers, parsed)).length;
}

/** True when user may enter free-form AI chat (after core structured questions). */
export function isCoreIntakeComplete(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): boolean {
  if (parsed.locationAmbiguous === true) return false;

  const schema = getEffectiveIntakeSchema(
    parsed.intentType,
    parsed.categorySlug,
    parsed,
    answers
  );
  const required = schema.fields.filter(
    (f) => f.required && fieldVisible(f, answers)
  );

  if (required.length === 0) {
    return countAnsweredFields(parsed, answers) >= 2;
  }

  const allRequiredDone = required.every((f) =>
    isFieldAnswered(f.key, answers, parsed)
  );
  if (allRequiredDone) return true;

  return countAnsweredRequiredFields(parsed, answers) >= 2;
}

function countAnsweredFields(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): number {
  const schema = getEffectiveIntakeSchema(
    parsed.intentType,
    parsed.categorySlug,
    parsed,
    answers
  );
  const visible = schema.fields.filter((f) => fieldVisible(f, answers));
  return visible.filter((f) => isFieldAnswered(f.key, answers, parsed)).length;
}

/** Whether structured questions are finished (next question would be done). */
export function isStructuredQuestionsDone(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): boolean {
  return getNextQuestion(parsed.intentType, parsed, answers).done;
}
