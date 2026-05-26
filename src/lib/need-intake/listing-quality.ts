/** Heuristics for listing title/description quality before publish. */

function normalizeForCompare(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[،,.؛;:!?؟]/g, '')
    .toLowerCase();
}

/** True when title is essentially the user's raw sentence (should not publish as-is). */
export function isTitleTooCloseToRaw(title: string, rawText: string): boolean {
  const t = normalizeForCompare(title);
  const r = normalizeForCompare(rawText);
  if (!t || !r) return false;
  if (t === r) return true;
  if (r.includes(t) && t.length >= r.length * 0.55) return true;
  if (t.includes(r) && r.length >= t.length * 0.55) return true;
  if (t.length > 40 && r.length > 40) {
    const shorter = t.length < r.length ? t : r;
    const longer = t.length < r.length ? r : t;
    if (longer.includes(shorter) && shorter.length / longer.length > 0.7) return true;
  }
  return false;
}

export function shouldPolishListing(
  title: string,
  description: string,
  rawText: string,
  opts?: { force?: boolean; alreadyEnriched?: boolean }
): boolean {
  if (opts?.alreadyEnriched && !opts?.force) return false;
  if (opts?.force) return true;
  if (isTitleTooCloseToRaw(title, rawText)) return true;
  const t = title.trim();
  if (t.length < 10) return true;
  if (description.trim().length < 40) return true;
  return false;
}
