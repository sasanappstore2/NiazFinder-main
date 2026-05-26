import type { ParsedIntent } from '@/contracts/need-intake';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import {
  findNeighborhoodInText,
  resolveNeighborhoodSlug,
} from '@/lib/need-intake/neighborhood-catalog';

/** Attach neighborhood slug resolution and missingFields to any parse result. */
export function enrichParsedIntent(parsed: ParsedIntent): ParsedIntent {
  let next = { ...parsed };

  if (next.city && !next.neighborhoodSlug && next.rawText) {
    const fromText = findNeighborhoodInText(next.city, next.rawText);
    if (fromText) {
      next = {
        ...next,
        neighborhoodSlug: fromText.slug,
        entities: {
          ...next.entities,
          area: fromText.matchedArea ?? fromText.name,
        },
      };
    }
  }

  if (next.city && next.entities?.area && !next.neighborhoodSlug) {
    const resolved = resolveNeighborhoodSlug(next.city, next.entities.area);
    if (resolved) {
      next = {
        ...next,
        neighborhoodSlug: resolved.slug,
        entities: { ...next.entities, area: resolved.name },
      };
    }
  }

  return {
    ...next,
    missingFields: computeMissingIntakeFields(next),
  };
}
