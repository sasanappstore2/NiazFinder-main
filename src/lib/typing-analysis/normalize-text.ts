/** Normalize Persian/Arabic variants for matching. */
export function normalizeTypingText(text: string): string {
  return text
    .trim()
    .replace(/\u200c/g, ' ')
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isTooShortForAnalysis(text: string): boolean {
  const n = normalizeTypingText(text).replace(/[^\p{L}\p{N}]/gu, '');
  return n.length < 3;
}
