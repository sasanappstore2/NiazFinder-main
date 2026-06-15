import type { ParsedIntent } from '@/contracts/need-intake';
import type { MissingFieldItem } from '@/intake/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';

const FIELD_LABELS_FA: Record<string, string> = {
  city: 'شهر',
  neighborhood: 'محله',
  category: 'دسته‌بندی',
  categorySlug: 'دسته‌بندی',
  serviceCategory: 'دسته خدمات',
  transactionType: 'نوع معامله',
  dealType: 'نوع معامله',
  budget: 'بودجه',
  budgetMin: 'بودجه',
  budgetMax: 'بودجه',
  rahnAmount: 'مبلغ رهن',
  monthlyRent: 'مبلغ اجاره',
  area: 'متراژ',
  rooms: 'تعداد اتاق',
  propertyKind: 'نوع ملک',
};

function labelForField(field: string): string {
  return FIELD_LABELS_FA[field] ?? field;
}

function mapMissingFieldToKey(field: string): string {
  if (field === 'transactionType') return 'dealType';
  if (field === 'categorySlug') return 'category';
  return field;
}

/** Rules-only gaps when MLX parse was skipped or returned no gaps. */
export function buildParseGapsFromRules(
  missingFields: MissingFieldItem[],
  parsed: ParsedIntent
): IntakeParseGap[] {
  const gaps: IntakeParseGap[] = [];
  const seen = new Set<string>();

  for (const item of missingFields) {
    if (!item.required) continue;
    const fieldKey = mapMissingFieldToKey(item.field);
    const id = `missing:${fieldKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    gaps.push({
      id,
      kind: 'missing',
      messageFa: `${labelForField(fieldKey)} را مشخص کنید`,
      fieldKey,
    });
  }

  if (
    parsed.locationResolutionStatus === 'city_ambiguous' ||
    (parsed.locationAmbiguous && (parsed.cityCandidates?.length ?? 0) >= 2)
  ) {
    const id = 'uncertain:city';
    if (!seen.has(id)) {
      seen.add(id);
      gaps.push({
        id,
        kind: 'uncertain',
        messageFa: 'شهر مشخص نیست — یکی را انتخاب کنید',
        fieldKey: 'city',
      });
    }
  }

  if (
    parsed.locationResolutionStatus === 'unresolved' &&
    !parsed.city?.trim() &&
    !parsed.entities?.area?.trim()
  ) {
    const id = 'missing:city';
    if (!seen.has(id)) {
      seen.add(id);
      gaps.push({
        id,
        kind: 'missing',
        messageFa: 'شهر را مشخص کنید',
        fieldKey: 'city',
      });
    }
  }

  return gaps;
}

export function mergeParseGaps(
  mlxGaps: IntakeParseGap[] | undefined,
  rulesGaps: IntakeParseGap[]
): IntakeParseGap[] {
  const byId = new Map<string, IntakeParseGap>();
  for (const g of rulesGaps) byId.set(g.id, g);
  for (const g of mlxGaps ?? []) byId.set(g.id, g);
  return [...byId.values()];
}
