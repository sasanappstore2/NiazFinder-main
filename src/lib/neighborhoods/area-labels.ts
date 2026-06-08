/** Sanitize neighborhood sub-area labels (client-safe). */

const DIGIT = '[\\d\\u06F0-\\u06F9\\u0660-\\u0669]';
const KOOCHEH = '\u06a9\u0648\u0686\u0647';
const SI = '\u0633\u06cc';
const VA = '\u0648';

function normSpaces(text: string): string {
  return text.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True when label is corrupted encoding garbage. */
export function isCorruptedAreaLabel(area: string): boolean {
  return /\?{2,}/.test(area);
}

/** Drop pure alley-number rows or labels that are only digits. */
function isAlleyNumberOnly(area: string): boolean {
  const s = normSpaces(area);
  if (!s) return true;
  if (new RegExp(`^${KOOCHEH}\\s*${DIGIT}`, 'u').test(s)) return true;
  if (new RegExp(`^${DIGIT}+$`, 'u').test(s)) return true;
  return false;
}

/** Strip trailing block/alley numbers from street labels. */
export function stripStreetNumberSuffix(label: string): string {
  let s = normSpaces(label);
  if (!s || isAlleyNumberOnly(s)) return '';

  // Glued trailing digits (e.g. name + block number without space)
  s = s.replace(new RegExp(`${DIGIT}+$`, 'u'), '').trim();
  // Trailing digits with space (e.g. name + 21)
  s = s.replace(new RegExp(`\\s+${DIGIT}+$`, 'u'), '').trim();
  // Persian compound numbers: "si va ..." at end
  s = s.replace(new RegExp(`\\s+${SI}\\s+${VA}\\s+\\S+$`, 'u'), '').trim();

  return s;
}

export function sanitizeAreaLabel(area: string, neighborhoodName: string): string | null {
  if (isCorruptedAreaLabel(area)) return null;
  if (isAlleyNumberOnly(area)) return null;

  const cleaned = stripStreetNumberSuffix(area);
  if (!cleaned) return null;

  if (!/[\u0600-\u06FFa-zA-Z]/u.test(cleaned)) return null;

  return cleaned;
}

export function sanitizeAreaLabels(
  areas: string[] | undefined,
  neighborhoodName: string
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of areas ?? []) {
    const label = sanitizeAreaLabel(raw, neighborhoodName);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }

  return out;
}
