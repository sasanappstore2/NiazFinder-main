/** Normalize Persian intake text for deduplication. */
export function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase();
}
