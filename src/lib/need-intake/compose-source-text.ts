/** Minimum need-text length to skip the optional details step. */
export const INTAKE_NEED_TEXT_SKIP_DETAILS_MIN = 40;

/** Shorter texts may proceed when category + city are already extracted. */
export const INTAKE_NEED_TEXT_EXTRACTED_MIN = 12;

export interface IntakeLocationProceedOpts {
  hasCategory?: boolean;
  hasCity?: boolean;
}

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
export function canProceedToIntakeLocation(
  needText: string,
  detailsText: string,
  opts?: IntakeLocationProceedOpts
): boolean {
  if (detailsText.trim().length > 0) return true;
  const need = needText.trim();
  if (need.length >= INTAKE_NEED_TEXT_SKIP_DETAILS_MIN) return true;
  if (need.length >= INTAKE_NEED_TEXT_EXTRACTED_MIN && opts?.hasCategory && opts?.hasCity) {
    return true;
  }
  return false;
}
