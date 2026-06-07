import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/config/need-schemas/labels';

/** Persian text shown in chat when user taps a suggestion chip (never raw slugs). */
export function chipValueToUserMessage(
  value: string,
  opts?: { label?: string; fieldKey?: string | null }
): string {
  const trimmed = value.trim();
  const chipLabel = opts?.label?.trim();
  if (chipLabel && !chipLabel.startsWith('__')) return chipLabel;

  if (trimmed.startsWith('__city__:')) {
    const cityId = trimmed.slice('__city__:'.length);
    const city = ALL_LOCATION_CITIES.find((c) => c.id === cityId);
    return city?.name ?? chipLabel ?? 'انتخاب شهر';
  }

  if (trimmed.startsWith('__hood__:')) {
    const slug = trimmed.slice('__hood__:'.length);
    if (chipLabel) return chipLabel;
    return slug.replace(/-/g, ' ');
  }

  if (trimmed === '__skip__') return 'بعداً';

  if (PROPERTY_DEAL_LABELS[trimmed]) return PROPERTY_DEAL_LABELS[trimmed];
  if (PROPERTY_KIND_LABELS[trimmed]) return PROPERTY_KIND_LABELS[trimmed];

  if (opts?.fieldKey === 'dealType' && PROPERTY_DEAL_LABELS[trimmed]) {
    return PROPERTY_DEAL_LABELS[trimmed];
  }
  if (opts?.fieldKey === 'propertyKind' && PROPERTY_KIND_LABELS[trimmed]) {
    return PROPERTY_KIND_LABELS[trimmed];
  }

  return chipLabel ?? trimmed;
}
