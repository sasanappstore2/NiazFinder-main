import { AMENITIES, FAMILY_COUNT, ROOMS } from '@/config/category-filters/options';
import { formatMoneyToman } from '@/lib/format/money';

function labelFromOptions(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatRoomsLabel(value: unknown): string | null {
  if (value == null || value === '') return null;
  return labelFromOptions(ROOMS, String(value));
}

export function formatFamilyCountLabel(value: unknown): string | null {
  if (value == null || value === '') return null;
  return labelFromOptions(FAMILY_COUNT, String(value));
}

export function formatAmenitiesLabels(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string' && value.trim()
      ? value.split(',').map((s) => s.trim())
      : [];
  return raw.map((v) => labelFromOptions(AMENITIES, v)).filter(Boolean);
}

/** Human-readable lines for real-estate advanced filter answers. */
export function realEstateFilterSummaryLines(answers: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const rooms = formatRoomsLabel(answers.rooms ?? answers.bedrooms);
  if (rooms) lines.push(`تعداد خواب: ${rooms}`);

  const family = formatFamilyCountLabel(answers.familyCount);
  if (family) lines.push(`تعداد نفرات خانواده: ${family}`);

  const amenities = formatAmenitiesLabels(answers.amenities);
  if (amenities.length) lines.push(`امکانات: ${amenities.join('، ')}`);

  if (answers.rahnAmount) {
    lines.push(`مبلغ رهن: ${formatMoneyToman(Number(answers.rahnAmount))} تومان`);
  }
  if (answers.monthlyRent) {
    lines.push(`اجاره ماهانه: ${formatMoneyToman(Number(answers.monthlyRent))} تومان`);
  }

  return lines;
}
