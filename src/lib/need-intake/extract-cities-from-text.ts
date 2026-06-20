import { CANONICAL_CITIES } from '@/config/locations';

function normalizeCityLabel(city: string): string {
  return city.trim();
}

/** All canonical city titles explicitly mentioned in intake text. */
export function extractCitiesMentionedInText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const found = new Set<string>();

  for (const city of CANONICAL_CITIES) {
    if (normalized.includes(city.title)) {
      found.add(city.title);
      continue;
    }
    if (normalized.toLowerCase().includes(city.slug)) {
      found.add(city.title);
    }
  }

  if (normalized.includes('\u0641\u0631\u0627\u0645\u0631\u0632')) found.add('\u0645\u0634\u0647\u062F');
  if (
    normalized.includes('\u0627\u0646\u062F\u06CC\u0634\u0647') ||
    normalized.includes('\u0641\u0631\u062D\u0632\u0627\u062F\u06CC') ||
    normalized.includes('\u0634\u0645\u0627\u0644 \u062A\u0647\u0631\u0627\u0646')
  ) {
    found.add('\u062A\u0647\u0631\u0627\u0646');
  }
  if (/\u0645\u0646\u0637\u0642\u0647\s*[\u06F0-\u06F9\u0660-\u06690-9]/u.test(normalized)) {
    found.add('\u062A\u0647\u0631\u0627\u0646');
  }

  return [...found].map(normalizeCityLabel).filter(Boolean);
}

export function textMentionsCityOtherThan(text: string, userCity: string): boolean {
  const scoped = userCity.trim();
  if (!scoped) return false;
  return extractCitiesMentionedInText(text).some((city) => city !== scoped);
}

export function citiesForUserReview(
  text: string,
  opts?: {
    parsedCity?: string | null;
    cityCandidates?: Array<{ label: string }> | null;
    userCity?: string | null;
  }
): string[] {
  const userCity = opts?.userCity?.trim() ?? '';
  const out = new Set<string>();

  for (const city of extractCitiesMentionedInText(text)) {
    if (!userCity || city !== userCity) out.add(city);
  }
  if (opts?.parsedCity?.trim()) {
    const parsed = opts.parsedCity.trim();
    if (!userCity || parsed !== userCity) out.add(parsed);
  }
  for (const candidate of opts?.cityCandidates ?? []) {
    const label = candidate.label?.trim();
    if (label && (!userCity || label !== userCity)) out.add(label);
  }

  return [...out];
}
