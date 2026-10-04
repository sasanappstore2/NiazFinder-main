import type { ParsedIntent } from '@/contracts/need-intake';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
import { parseCity } from '@/lib/need-intake/intent-parser';
import { buildPropertyTitle, buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import { applyLocationResolutionToParsed } from '@/lib/need-intake/location-resolution-engine';
import { findNeighborhoodInText } from '@/lib/need-intake/neighborhood-catalog.server';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import { parseAreaFromText } from '@/lib/need-intake/vertical-classifier';
import {
  isPropertyParsedIntent,
  isVehicleParsedIntent,
  shouldSkipNeighborhoodAutoResolve,
} from '@/lib/need-intake/enrich-parsed-intent-core';

function isPropertyParsed(parsed: ParsedIntent): boolean {
  return isPropertyParsedIntent(parsed);
}

function isVehicleParsed(parsed: ParsedIntent): boolean {
  return isVehicleParsedIntent(parsed);
}

/** Attach neighborhood slug, slot extraction, optional disambiguation, and missingFields. */
export function enrichParsedIntent(
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

  if (isPropertyParsed(next) && raw && !skipNeighborhoodAuto) {
    const locationText = opts?.locationText ?? raw;
    const cityHint =
      next.city?.trim() ||
      parseCity(locationText) ||
      opts?.preferredCityName?.trim() ||
      undefined;
    next = applyLocationResolutionToParsed(
      { ...next, city: cityHint || next.city },
      {
        preferredCityId: opts?.preferredCityId,
        preferredCityName: opts?.preferredCityName,
        locationText,
      }
    );
  }

  if (isVehicleParsed(next) && raw) {
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

    if (city && area) {
      const hit = findNeighborhoodInText(city, raw);
      if (hit) {
        next = {
          ...next,
          city,
          neighborhoodSlug: hit.slug,
          entities: {
            ...next.entities,
            neighborhood: (hit.matchedArea ?? hit.name).trim(),
          },
        };
      }
    }
  }

  if (skipNeighborhoodAuto || next.intentType === 'real_estate_service') {
    next = {
      ...next,
      title: buildRealEstateServiceTitle(next.entities, next.city),
    };
  } else if (isPropertyParsed(next)) {
    next = {
      ...next,
      title: buildPropertyTitle(
        next.intentType,
        next.entities,
        next.city,
        next.entities.areaMin ?? next.entities.area
      ),
    };
  }

  return {
    ...next,
    missingFields: computeMissingIntakeFields(next),
  };
}
