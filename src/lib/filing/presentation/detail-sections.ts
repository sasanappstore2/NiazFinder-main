import type { FilingPriceRow } from '@/lib/filing/presentation/list-card-present';
import {
  amenityLabelFa,
  resolveFilingCategoryTemplate,
  type FilingAmenityKey,
} from '@/lib/filing/schema/category-templates';
import { filingSpecRow } from '@/lib/filing/content/spec-values';
import type { FilingViewModel } from '@/lib/filing/presentation/view-model';
import { formatPriceText, formatTomanAmount, parseMoneyInput } from '@/lib/format/money';

export type FilingDetailSpecRow = {
  key: string;
  label: string;
  value: string | null;
};

export type FilingDetailSections = {
  priceRows: FilingPriceRow[];
  specs: FilingDetailSpecRow[];
  filledSpecs: FilingDetailSpecRow[];
  maskanyabanSpecs: FilingDetailSpecRow[];
  amenities: string[];
  completeness: number | null;
  showCompletenessBanner: boolean;
  categoryTemplate: ReturnType<typeof resolveFilingCategoryTemplate>;
  specsSectionTitle: string;
};

function moneyRow(key: string, label: string, raw?: string | null): FilingPriceRow | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = parseMoneyInput(value);
  const hint = parsed != null && parsed > 0 ? formatTomanAmount(parsed) : null;
  return {
    key,
    label,
    value: formatPriceText(value) ?? value,
    hint,
  };
}

function buildPriceRows(vm: FilingViewModel): FilingPriceRow[] {
  const deal = vm.dealType;
  if (deal === 'sell') {
    const sale = moneyRow('price', 'مبلغ کل', vm.price);
    return sale ? [sale] : [];
  }
  if (deal === 'rent_rahn_full') {
    const full = moneyRow('deposit', 'مبلغ رهن کامل', vm.deposit ?? vm.price);
    return full ? [full] : [];
  }
  if (deal === 'rent_rahn_ejare' || deal === 'rent_short_term') {
    const rows: FilingPriceRow[] = [];
    const deposit = moneyRow('deposit', 'مبلغ رهن', vm.deposit);
    const rent = moneyRow('rent', 'مبلغ اجاره', vm.monthlyRent);
    if (deposit) rows.push(deposit);
    if (rent) rows.push(rent);
    return rows;
  }
  const fallback = moneyRow('price', 'مبلغ کل', vm.price);
  return fallback ? [fallback] : [];
}

function buildAmenities(vm: FilingViewModel, keys: readonly FilingAmenityKey[]): string[] {
  const labels: string[] = [];
  for (const key of keys) {
    if (vm.amenities[key]) labels.push(amenityLabelFa(key));
  }
  if (!labels.length && vm.sourceMeta.rawFeatures) {
    for (const token of vm.sourceMeta.rawFeatures.split(/\s+/).filter(Boolean)) {
      if (!labels.includes(token)) labels.push(token);
    }
  }
  return labels;
}

export function buildFilingDetailSections(vm: FilingViewModel): FilingDetailSections {
  const categoryTemplate = resolveFilingCategoryTemplate(vm.propertyKind);

  const specs = categoryTemplate.specKeys.map((key) => filingSpecRow(vm, key));
  const filledSpecs = specs.filter((s) => s.value != null);
  const maskanyabanSpecs = specs;

  const completeness = vm.dataCompleteness ?? null;

  return {
    priceRows: buildPriceRows(vm),
    specs,
    filledSpecs,
    maskanyabanSpecs,
    amenities: buildAmenities(vm, categoryTemplate.amenityKeys),
    completeness,
    showCompletenessBanner: completeness != null && completeness < 45,
    categoryTemplate,
    specsSectionTitle: categoryTemplate.specsSectionTitle,
  };
}
