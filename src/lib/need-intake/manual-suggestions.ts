import { getCategoryBySlug, normalizeCategoryPair } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';
import type { FieldOption, ParsedIntent } from '@/contracts/need-intake';
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

export function buildManualSuggestionChips(
  parsed: ParsedIntent,
  initialCity?: string | null
): FieldOption[] {
  const opts: FieldOption[] = [];

  const categoryCandidates = suggestNeedCategoriesFromText(parsed.rawText, 4);
  for (const candidate of categoryCandidates) {
    const pair = normalizeCategoryPair(candidate.slug);
    const leaf = getCategoryBySlug(pair.subcategorySlug ?? pair.categorySlug);
    const parent = getCategoryBySlug(pair.categorySlug);
    const label =
      leaf && parent && leaf.slug !== parent.slug
        ? `دسته: ${parent.title} ← ${leaf.title}`
        : `دسته: ${leaf?.title ?? candidate.slug}`;
    opts.push({ value: `category:${pair.categorySlug}:${pair.subcategorySlug ?? ''}`, label });
  }

  const citySuggestions = new Set<string>();
  if (initialCity?.trim()) citySuggestions.add(initialCity.trim());
  if (parsed.city?.trim()) citySuggestions.add(parsed.city.trim());
  const text = parsed.rawText;
  for (const city of CANONICAL_CITIES) {
    if (text.includes(city.title) || text.toLowerCase().includes(city.slug)) {
      citySuggestions.add(city.title);
    }
  }
  for (const city of citySuggestions) {
    opts.push({ value: `city:${city}`, label: `شهر: ${city}` });
  }

  if (parsed.neighborhoodCandidates?.length) {
    for (const n of parsed.neighborhoodCandidates.slice(0, 5)) {
      opts.push({ value: `neighborhood:${n.slug}`, label: `محله: ${n.label}` });
    }
    opts.push({ value: 'neighborhood:__other__', label: 'محله دیگری مدنظر دارم' });
  } else if (parsed.entities?.area?.trim()) {
    opts.push({
      value: `area:${parsed.entities.area.trim()}`,
      label: `محله/محدوده: ${parsed.entities.area.trim()}`,
    });
  }

  return uniqueByValue(opts);
}

