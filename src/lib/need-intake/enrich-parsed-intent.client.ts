import type { ParsedIntent } from '@/contracts/need-intake';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
import { parseCity } from '@/lib/need-intake/intent-parser';
import { buildPropertyTitle, buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import { parseAreaFromText } from '@/lib/need-intake/vertical-classifier';
import {
  isPropertyParsedIntent,
  isVehicleParsedIntent,
  shouldSkipNeighborhoodAutoResolve,
} from '@/lib/need-intake/enrich-parsed-intent-core';

/**
 * Browser-safe enrich: slots, multi-word location fragment, titles ? no fs/catalog LRE.
 * Managed-neighborhood resolution runs in `use-intake-location` on the client.
 */
export function enrichParsedIntentClient(
  parsed: ParsedIntent,
  opts?: {
    preferredCityId?: string | null;
    preferredCityName?: string | null;
    locationText?: string;
  }
): ParsedIntent {
  let next: ParsedIntent = applyPropertySlotsToParsed(parsed);
  const raw = next.rawText?.trim() ?? '';
  const skipNeighborhoodAuto = shouldSkipNeighborhoodAutoResolve(next);

  if (isPropertyParsedIntent(next) && raw && !skipNeighborhoodAuto) {
    const locationText = opts?.locationText ?? raw;
    const cityHint =
      next.city?.trim() ||
      parseCity(locationText) ||
      opts?.preferredCityName?.trim() ||
      undefined;
    const fragment = extractLocationFragment(locationText)?.trim();
    const areaFromText = parseAreaFromText(locationText, opts?.preferredCityId)?.trim();
    const areaLabel = fragment || areaFromText;

    next = {
      ...next,
      city: cityHint || next.city,
      entities: {
        ...next.entities,
        ...(areaLabel ? { area: areaLabel } : {}),
      },
    };
  }

  if (isVehicleParsedIntent(next) && raw) {
    const city = next.city?.trim() || parseCity(raw);
    const area =
      parseAreaFromText(raw)?.trim() ||
      next.entities?.area?.trim() ||
      '';
    const brand =
      next.entities?.brand?.trim() ||
      extractVehicleSubjectFromText(raw) ||
      '';
    const entityPatch: Record<string, string> = { ...(next.entities ?? {}) };
    if (area) entityPatch.area = area;
    if (brand) entityPatch.brand = brand;
    next = {
      ...next,
      city: city || next.city,
      entities: entityPatch,
    };
  }

  if (skipNeighborhoodAuto || next.intentType === 'real_estate_service') {
    next = {
      ...next,
      title: buildRealEstateServiceTitle(next.entities, next.city),
    };
  } else if (isPropertyParsedIntent(next)) {
    next = {
      ...next,
      title: buildPropertyTitle(
        next.intentType,
        next.entities,
        next.city,
        next.entities.area
      ),
    };
  }

  return {
    ...next,
    missingFields: computeMissingIntakeFields(next),
  };
}
