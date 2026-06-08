/** Bigram Dice coefficient ? lightweight substitute for pg_trgm similarity. */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(0.95, Math.max(a.length, b.length) / Math.min(a.length, b.length) * 0.5);
  }

  const bigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };

  const aBg = bigrams(a);
  const bBg = bigrams(b);
  let overlap = 0;
  for (const [bg, count] of aBg) {
    overlap += Math.min(count, bBg.get(bg) ?? 0);
  }
  const total =
    [...aBg.values()].reduce((s, n) => s + n, 0) +
    [...bBg.values()].reduce((s, n) => s + n, 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

export function scoreLocationName(text: string, name: string): number {
  const normalizedName = name.trim();
  if (!normalizedName) return 0;
  if (text.includes(normalizedName)) {
    return Math.min(0.98, 0.85 + normalizedName.length / Math.max(text.length, 1) * 0.15);
  }
  return trigramSimilarity(text, normalizedName);
}
