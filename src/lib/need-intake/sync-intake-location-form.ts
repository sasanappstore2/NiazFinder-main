import { CANONICAL_CITIES, getCityBySlug } from '@/config/locations';
import type { NeedDraft } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/entities/entityRecord';
import type { City } from '@/lib/location-system';
import { cityFromSlug, locationCityIdToSlug } from '@/lib/search/city-slugs';

/** Pick managed city row for neighborhood catalog (handles duplicate Persian names). */
export function resolveManagedCityForNeighborhoods(
  managedCities: City[],
  cityName: string
): City | null {
  const trimmed = cityName.trim();
  if (!trimmed) return null;

  const matches = managedCities.filter((c) => c.name === trimmed);
  if (matches.length === 0) {
    return managedCities.find((c) => c.id === trimmed || c.name === trimmed) ?? null;
  }
  if (matches.length === 1) return matches[0]!;

  // Same Persian name can map to multiple ids (e.g. nishapur vs nishabur); prefer catalog slug id.
  const canonical = matches.find((c) => c.id === locationCityIdToSlug(c.id));
  if (canonical) return canonical;

  const byKnownSlug = matches.find((c) => cityFromSlug(locationCityIdToSlug(c.id)));
  return byKnownSlug ?? matches[0]!;
}

export interface IntakeLocationFormValues {
  city: string;
  neighborhood: string;
}

/** Resolve engine/parser city to a value that matches `<option value={city.name}>`. */
export function resolveIntakeCitySelectValue(
  managedCities: City[],
  opts: {
    cityName?: string | null;
    citySlug?: string | null;
    cityId?: string | null;
  }
): string | null {
  const name = opts.cityName?.trim();
  if (name) {
    const exact = managedCities.find((c) => c.name === name);
    if (exact) return exact.name;
  }

  const slug = (opts.citySlug ?? (opts.cityId ? locationCityIdToSlug(opts.cityId) : null))
    ?.trim()
    .toLowerCase();
  if (slug) {
    const fromManaged = managedCities.find(
      (c) => locationCityIdToSlug(c.id) === slug || c.id === slug
    );
    if (fromManaged) return fromManaged.name;

    const canonical = getCityBySlug(slug) ?? CANONICAL_CITIES.find((c) => c.slug === slug);
    if (canonical) {
      const byTitle = managedCities.find((c) => c.name === canonical.title);
      if (byTitle) return byTitle.name;
      return canonical.title;
    }
  }

  if (name) return name;
  return null;
}

export function extractIntakeLocationFromDraft(
  draft: NeedDraft | null,
  managedCities: City[]
): IntakeLocationFormValues {
  if (!draft) return { city: '', neighborhood: '' };

  const entities = recordToEntities(draft.entities);
  const parsed = draft.parsedIntent;

  const city =
    resolveIntakeCitySelectValue(managedCities, {
      cityName: entities.city ?? parsed.city,
      citySlug: entities.citySlug,
      cityId: entities.citySlug,
    }) ?? '';

  const neighborhood =
    entities.neighborhood?.trim() ||
    parsed.entities?.area?.trim() ||
    '';

  return { city, neighborhood };
}
