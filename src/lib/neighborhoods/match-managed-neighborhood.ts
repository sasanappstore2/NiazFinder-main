import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

function normalize(text: string): string {
  return text.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function compact(text: string): string {
  return normalize(text).replace(/\s+/g, '');
}

/** Drop trailing city token — e.g. «فرامرز عباسی، مشهد» → «فرامرز عباسی». */
export function stripCityFromLocationLabel(text: string, cityName?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const cityNorm = cityName?.trim() ? normalize(cityName) : '';
  const parts = trimmed.split(/[،,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && cityNorm) {
    const last = normalize(parts[parts.length - 1]!);
    if (last === cityNorm) {
      return parts.slice(0, -1).join('، ').trim();
    }
  }

  if (cityNorm) {
    const norm = normalize(trimmed);
    if (norm.endsWith(cityNorm)) {
      return trimmed.slice(0, trimmed.length - cityName!.trim().length).replace(/[،,\s]+$/u, '').trim();
    }
  }

  return trimmed;
}

/**
 * Map free-form neighborhood text to a managed catalog row (browse filter list).
 */
export function matchManagedNeighborhood(
  neighborhoods: ManagedNeighborhood[],
  query: string,
  cityName?: string
): ManagedNeighborhood | null {
  const raw = query.trim();
  if (!raw || !neighborhoods.length) return null;

  const withoutCity = stripCityFromLocationLabel(raw, cityName);
  const compactQ = compact(withoutCity);
  const compactRaw = compact(raw);

  for (const n of neighborhoods) {
    if (n.name === raw || n.name === withoutCity || n.id === raw) return n;

    const cn = compact(n.name);
    if (cn === compactQ || cn === compactRaw) return n;
  }

  const ambiguityHits = findManagedNeighborhoodAmbiguity(neighborhoods, withoutCity || raw);
  if (ambiguityHits.length >= 2) return null;
  if (ambiguityHits.length === 1) {
    const only = ambiguityHits[0]!.neighborhood;
    // Prefer exact managed name over a lone sub-area parent when both exist
    const exactName = neighborhoods.find(
      (n) => compact(n.name) === compactQ || compact(n.name) === compactRaw
    );
    if (exactName && exactName.id !== only.id) return exactName;
    return only;
  }

  // Whole-token name matches (e.g. «فردوسی» in «توس فردوسی») — never greedily pick one
  const tokenNameHits = neighborhoods.filter((n) => {
    const nameTokens = normalize(n.name)
      .split(/[\s،,.]+/)
      .map((t) => compact(t))
      .filter(Boolean);
    return nameTokens.includes(compactQ) || nameTokens.includes(compactRaw);
  });
  if (tokenNameHits.length === 1) return tokenNameHits[0]!;
  if (tokenNameHits.length >= 2) return null;

  for (const n of neighborhoods) {
    const cn = compact(n.name);
    if (compactQ.length >= 4 && (cn.includes(compactQ) || compactQ.includes(cn))) return n;

    for (const area of n.areas ?? []) {
      const an = normalize(area);
      if (an === normalize(withoutCity) || an === normalize(raw)) return n;
      const ca = compact(area);
      if (compactQ.length >= 3 && (ca.includes(compactQ) || compactQ.includes(ca))) return n;
    }
  }

  const qTokens = normalize(withoutCity)
    .split(/[\s،,.]+/)
    .filter((t) => t.length >= 3);
  if (qTokens.length === 0) return null;

  let best: { n: ManagedNeighborhood; score: number } | null = null;
  for (const n of neighborhoods) {
    const nameNorm = normalize(n.name);
    const nameTokens = nameNorm.split(/\s+/).filter(Boolean);
    let matched = 0;
    for (const qt of qTokens) {
      const hit =
        nameTokens.some((nt) => nt.includes(qt) || qt.includes(nt)) ||
        nameNorm.includes(qt) ||
        (n.areas ?? []).some((a) => {
          const an = normalize(a);
          return an.includes(qt) || qt.includes(an);
        });
      if (hit) matched += 1;
    }
    if (matched === qTokens.length) {
      const score = matched * 100 - n.name.length;
      if (!best || score > best.score) best = { n, score };
    }
  }

  return best?.n ?? null;
}

/** Resolve a managed catalog row by slug id (browse filter id). */
export function lookupManagedNeighborhoodBySlug(
  neighborhoods: ManagedNeighborhood[],
  slug: string
): ManagedNeighborhood | null {
  const id = slug.trim();
  if (!id) return null;
  return neighborhoods.find((n) => n.id === id || n.id.toLowerCase() === id.toLowerCase()) ?? null;
}
