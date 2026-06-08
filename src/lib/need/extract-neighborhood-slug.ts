/** Read neighborhood slug from published `dynamicAnswers` JSON. */
export function extractNeighborhoodSlugFromDynamicAnswers(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const direct = data._neighborhoodSlug;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const entities = data.entities;
    if (entities && typeof entities === 'object' && !Array.isArray(entities)) {
      const slug = (entities as Record<string, unknown>).neighborhoodSlug;
      if (typeof slug === 'string' && slug.trim()) return slug.trim();
    }

    const flat = data.neighborhoodSlug;
    if (typeof flat === 'string' && flat.trim()) return flat.trim();
  } catch {
    // fall through to regex
  }

  const match = raw.match(/"_neighborhoodSlug"\s*:\s*"([^"\\]+)"/);
  return match?.[1]?.trim() || null;
}
