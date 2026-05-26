/**
 * Match ServiceRequest.dynamicAnswers JSON against attribute filters (SQLite-friendly).
 */

export function buildDynamicAnswerMatchers(
  attributes: Record<string, string>
): Array<(json: string) => boolean> {
  const matchers: Array<(json: string) => boolean> = [];

  for (const [key, expected] of Object.entries(attributes)) {
    if (!expected) continue;
    const needle = `"${key}":"${expected}"`;
    const needleNum = `"${key}":${expected}`;
    const needleQuotedNum = `"${key}":"${expected}"`;
    matchers.push((json) => {
      if (json.includes(needle) || json.includes(needleNum)) return true;
      try {
        const obj = JSON.parse(json) as Record<string, unknown>;
        const val = obj[key];
        if (val == null) return false;
        if (Array.isArray(val)) return val.map(String).includes(expected);
        return String(val) === expected;
      } catch {
        return json.includes(needleQuotedNum);
      }
    });
  }

  return matchers;
}

export function matchesDynamicAnswers(
  json: string,
  attributes: Record<string, string>
): boolean {
  const matchers = buildDynamicAnswerMatchers(attributes);
  if (matchers.length === 0) return true;
  return matchers.every((m) => m(json));
}

/** Numeric min/max on parsed JSON (post-filter helper). */
export function matchesNumericRanges(
  json: string,
  ranges: { key: string; min?: number; max?: number }[]
): boolean {
  if (ranges.length === 0) return true;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return true;
  }
  for (const { key, min, max } of ranges) {
    const raw = obj[key];
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(String(raw).replace(/,/g, ''))
          : NaN;
    if (Number.isNaN(n)) continue;
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
  }
  return true;
}
