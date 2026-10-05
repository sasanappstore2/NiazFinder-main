/**
 * Normalize only spelling/spacing noise before deterministic parsing and Si.
 * The original user text always remains in the request and draft.
 */
export function normalizePostNaturalText(input: string): string {
  return input
    .replace(/[يى]/gu, 'ی')
    .replace(/[ك]/gu, 'ک')
    .replace(/[ۀة]/gu, 'ه')
    .replace(/[ؤ]/gu, 'و')
    .replace(/[إأ]/gu, 'ا')
    // Persian ezafe is commonly typed as a combining hamza (e.g. «اجارهٔ»).
    // It is orthographic, not semantic, and otherwise breaks phrase rules.
    .replace(/\u0654/gu, '')
    .replace(/[\u200b\u200d]/gu, '')
    .replace(/[\u200c]/gu, ' ')
    .replace(/[\u0640]/gu, '')
    .replace(/[\u066B]/gu, '.')
    .replace(/[\u066C]/gu, ',')
    .replace(/[۰-۹]/gu, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\s+/gu, ' ')
    .trim();
}
