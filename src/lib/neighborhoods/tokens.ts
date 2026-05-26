import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

/** All search tokens for a neighborhood (name + areas). */
export function neighborhoodSearchTokens(n: ManagedNeighborhood): string[] {
  const tokens = [n.name];
  if (n.areas?.length) tokens.push(...n.areas);
  return tokens.filter(Boolean);
}

type TextContainsFilter = {
  address?: { contains: string };
  description?: { contains: string };
  dynamicAnswers?: { contains: string };
};

/** Build Prisma AND clause for selected neighborhoods (OR across all tokens). */
export function buildNeighborhoodWhereClauses(
  neighborhoods: ManagedNeighborhood[]
): { OR: TextContainsFilter[] }[] {
  const or: TextContainsFilter[] = [];

  for (const n of neighborhoods) {
    for (const token of neighborhoodSearchTokens(n)) {
      or.push({ address: { contains: token } });
      or.push({ description: { contains: token } });
      or.push({ dynamicAnswers: { contains: token } });
    }
  }

  return or.length ? [{ OR: or }] : [];
}
