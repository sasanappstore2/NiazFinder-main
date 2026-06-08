/** Minimum need-text length to skip the optional details step. */
export const INTAKE_NEED_TEXT_SKIP_DETAILS_MIN = 40;

/**
 * Single canonical format for intake source text (parse, analyze, draft, publish).
 */
export function composeIntakeSourceText(needText: string, detailsText: string): string {
  const need = needText.trim();
  const details = detailsText.trim();
  if (!need && !details) return '';
  if (!details) return need;
  if (!need) return details;
  return `${need}\n\nتوضیحات:\n${details}`;
}

/** User may proceed to location when details are filled or need text is rich enough. */
export function canProceedToIntakeLocation(needText: string, detailsText: string): boolean {
  if (detailsText.trim().length > 0) return true;
  return needText.trim().length >= INTAKE_NEED_TEXT_SKIP_DETAILS_MIN;
}
