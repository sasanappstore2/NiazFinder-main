import { getCategoryBySlug, normalizeCategoryPair } from '@/config/categories';
import type { FieldOption, ParsedIntent } from '@/contracts/need-intake';
import { citiesForUserReview } from '@/lib/need-intake/extract-cities-from-text';
import { suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';

function uniqueByValue(options: FieldOption[]): FieldOption[] {
  const seen = new Set<string>();
  const out: FieldOption[] = [];
  for (const opt of options) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    out.push(opt);
  }
  return out;
}

function categoryChipLabel(slug: string, fallbackLabel?: string): string {
  const pair = normalizeCategoryPair(slug);
  const leaf = getCategoryBySlug(pair.subcategorySlug ?? pair.categorySlug);
  const parent = getCategoryBySlug(pair.categorySlug);
  if (fallbackLabel?.trim()) {
    return leaf && parent && leaf.slug !== parent.slug
      ? `دسته: ${parent.title} ← ${fallbackLabel.trim()}`
      : `دسته: ${fallbackLabel.trim()}`;
  }
  return leaf && parent && leaf.slug !== parent.slug
    ? `دسته: ${parent.title} ← ${leaf.title}`
    : `دسته: ${leaf?.title ?? slug}`;
}

export function buildManualSuggestionChips(
  parsed: ParsedIntent,
  userCity?: string | null
): FieldOption[] {
  const opts: FieldOption[] = [];

  const ruleCandidates = parsed.categoryCandidates ?? [];
  if (ruleCandidates.length > 0) {
    for (const candidate of ruleCandidates.slice(0, 6)) {
      const pair = normalizeCategoryPair(candidate.slug);
      opts.push({
        value: `category:${pair.categorySlug}:${pair.subcategorySlug ?? ''}`,
        label: categoryChipLabel(candidate.slug, candidate.label),
      });
    }
  } else {
    const categoryCandidates = suggestNeedCategoriesFromText(parsed.rawText, 4);
    for (const candidate of categoryCandidates) {
      const pair = normalizeCategoryPair(candidate.slug);
      opts.push({
        value: `category:${pair.categorySlug}:${pair.subcategorySlug ?? ''}`,
        label: categoryChipLabel(pair.subcategorySlug ?? pair.categorySlug),
      });
    }
  }

  const text = parsed.rawText;
  const userCityNorm = userCity?.trim() ?? '';
  for (const city of citiesForUserReview(text, {
    parsedCity: parsed.city,
    cityCandidates: parsed.cityCandidates,
    userCity: userCityNorm,
  })) {
    opts.push({
      value: `city:${city}`,
      label: userCityNorm ? `شهر: ${city} (در متن آگهی)` : `شهر: ${city}`,
    });
  }

  if (parsed.neighborhoodCandidates?.length) {
    for (const n of parsed.neighborhoodCandidates.slice(0, 5)) {
      const hoodCity = n.city?.trim();
      const baseLabel = n.label.trim();
      const label =
        hoodCity && userCityNorm && hoodCity !== userCityNorm
          ? `${baseLabel} (${hoodCity})`
          : baseLabel;
      opts.push({ value: `neighborhood:${n.slug}`, label });
    }
    opts.push({ value: 'neighborhood:__other__', label: 'محله دیگری مدنظر دارم' });
  }

  return uniqueByValue(opts);
}

