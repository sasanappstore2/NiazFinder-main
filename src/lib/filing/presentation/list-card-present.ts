import type { PropertyListing } from '@/contracts/business-profile';
import {
  isListingRentDeal,
  isListingSaleDeal,
  normalizeListingDealType,
  propertyListingDealTypeLabel,
  type PropertyListingDealType,
} from '@/lib/business/real-estate-listing-deal-types';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import { formatJalaaliFromParts, gregorianToJalaali } from '@/lib/format/jalali-calendar';
import { toAsciiDigits, toPersianDigits } from '@/lib/format/digits';
import { formatPriceText, formatTomanAmount, parseMoneyInput } from '@/lib/format/money';
import {
  inferListingPropertyKind,
  WORKSPACE_PROPERTY_KIND_OPTIONS,
} from '@/lib/filing/schema/preferences';
import { buildCategoryFilingListSpecs, type FilingListSpecChip } from '@/lib/filing/presentation/list-card-specs';
import type { WorkspaceFileItem } from '@/components/workspace/types';

export type FilingSpecItem = FilingListSpecChip;

const KIND_LABEL_BY_VALUE = Object.fromEntries(
  WORKSPACE_PROPERTY_KIND_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

export type FilingPriceRow = {
  key: string;
  label: string;
  value: string;
  hint: string | null;
};

export type FilingListCardModel = {
  dealKindLine: string;
  title: string;
  locationLine: string | null;
  fileCode: string;
  dateLabel: string | null;
  areaSqm: number | null;
  pricePerMeterLabel: string | null;
  priceRows: FilingPriceRow[];
  specs: FilingSpecItem[];
  sourceLabel: string | null;
  isOwn: boolean;
  dealTone: 'sale' | 'rent' | 'land' | 'villa' | 'default';
};

function propertyKindLabel(listing: PropertyListing): string | null {
  const kind = inferListingPropertyKind(listing);
  if (kind === 'other') {
    const cat = propertyListingCategoryLabel(listing.categorySlug);
    if (cat) return cat.split('·').pop()?.trim() ?? cat;
    return null;
  }
  return KIND_LABEL_BY_VALUE[kind] ?? null;
}

export function parseListingAreaSqm(area?: string): number | null {
  if (!area?.trim()) return null;
  const ascii = toAsciiDigits(area).replace(/[^\d.]/g, '');
  const n = Number(ascii);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function formatFileCode(listing: PropertyListing): string {
  if (listing.fileCode?.trim()) return listing.fileCode.trim();
  const compact = listing.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6) || listing.id.slice(-6);
  return compact;
}

function primaryAmountToman(
  listing: PropertyListing,
  deal: PropertyListingDealType
): number | null {
  if (isListingSaleDeal(listing.dealType)) {
    return parseMoneyInput(listing.price ?? '');
  }
  if (deal === 'rent_rahn_full') {
    return parseMoneyInput(listing.deposit ?? listing.price ?? '');
  }
  if (deal === 'rent_rahn_ejare') {
    return parseMoneyInput(listing.deposit ?? '');
  }
  if (isListingRentDeal(listing.dealType)) {
    return parseMoneyInput(listing.price ?? listing.deposit ?? '');
  }
  return parseMoneyInput(listing.price ?? '');
}

function resolvePricePerMeterLabel(listing: PropertyListing): string | null {
  if (!isListingSaleDeal(listing.dealType)) return null;

  if (listing.pricePerMeter?.trim()) {
    const parsed = parseMoneyInput(listing.pricePerMeter);
    if (parsed && parsed > 0) return `${formatTomanAmount(parsed)} / متر`;
    const text = formatPriceText(listing.pricePerMeter);
    return text ? `${text} / متر` : null;
  }

  const area = parseListingAreaSqm(listing.area);
  const deal = normalizeListingDealType(listing.dealType);
  const amount = primaryAmountToman(listing, deal);
  if (!area || !amount || amount <= 0) return null;

  const perMeter = Math.round(amount / area);
  if (perMeter <= 0) return null;
  return `${formatTomanAmount(perMeter)} / متر`;
}

function moneyRow(key: string, label: string, raw?: string): FilingPriceRow | null {
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

function buildPriceRows(listing: PropertyListing): FilingPriceRow[] {
  const deal = normalizeListingDealType(listing.dealType);

  if (isListingSaleDeal(listing.dealType)) {
    const sale = moneyRow('price', 'مبلغ کل', listing.price);
    return sale ? [sale] : [];
  }

  if (!isListingRentDeal(listing.dealType)) {
    const fallback = moneyRow('price', 'مبلغ کل', listing.price);
    return fallback ? [fallback] : [];
  }

  if (deal === 'rent_rahn_full') {
    const full = moneyRow('deposit', 'مبلغ رهن کامل', listing.deposit ?? listing.price);
    return full ? [full] : [];
  }

  const rows: FilingPriceRow[] = [];
  const deposit = moneyRow('deposit', 'مبلغ رهن', listing.deposit);
  const rent = moneyRow('rent', 'مبلغ اجاره', listing.monthlyRent);
  if (deposit) rows.push(deposit);
  if (rent) rows.push(rent);
  if (!rows.length) {
    const fallback = moneyRow('price', 'مبلغ کل', listing.price);
    if (fallback) rows.push(fallback);
  }
  return rows;
}

function buildSpecs(listing: PropertyListing): FilingSpecItem[] {
  return buildCategoryFilingListSpecs(listing);
}

function dealTone(listing: PropertyListing): FilingListCardModel['dealTone'] {
  const kind = inferListingPropertyKind(listing);
  if (kind === 'land') return 'land';
  if (kind === 'villa') return 'villa';
  if (isListingSaleDeal(listing.dealType)) return 'sale';
  if (isListingRentDeal(listing.dealType)) return 'rent';
  return 'default';
}

export function buildFilingListCardModel(item: WorkspaceFileItem): FilingListCardModel {
  const listing = item.listing;
  const kindLabel = propertyKindLabel(listing);
  const dealLabel = item.dealLabel || propertyListingDealTypeLabel(listing.dealType);
  const dealKindLine = [dealLabel, kindLabel].filter(Boolean).join(' ');

  let dateLabel: string | null = null;
  const dateRaw = item.listing.postedAt ?? item.createdAt;
  if (dateRaw) {
    try {
      dateLabel = formatJalaaliFromParts(gregorianToJalaali(new Date(dateRaw)), {
        withWeekday: true,
      });
    } catch {
      dateLabel = null;
    }
  }

  const areaSqm = parseListingAreaSqm(listing.area);

  return {
    dealKindLine,
    title: listing.title?.trim() || dealKindLine,
    locationLine: listing.location?.trim() ?? null,
    fileCode: toPersianDigits(formatFileCode(listing)),
    dateLabel,
    areaSqm,
    pricePerMeterLabel: resolvePricePerMeterLabel(listing),
    priceRows: buildPriceRows(listing),
    specs: buildSpecs(listing),
    sourceLabel: item.sourceProvider ?? null,
    isOwn: item.sourceKind === 'own',
    dealTone: dealTone(listing),
  };
}

export const FILING_HIGHLIGHT_CLASS: Record<FilingListCardModel['dealTone'], string> = {
  sale: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
  rent: 'bg-sky-500/12 text-sky-800 dark:text-sky-300',
  land: 'bg-stone-500/12 text-stone-800 dark:text-stone-300',
  villa: 'bg-violet-500/12 text-violet-800 dark:text-violet-300',
  default: 'bg-primary/10 text-primary',
};

export const FILING_PRICE_ACCENT_CLASS: Record<FilingListCardModel['dealTone'], string> = {
  sale: 'text-emerald-600 dark:text-emerald-400',
  rent: 'text-emerald-600 dark:text-emerald-400',
  land: 'text-emerald-600 dark:text-emerald-400',
  villa: 'text-emerald-600 dark:text-emerald-400',
  default: 'text-emerald-600 dark:text-emerald-400',
};
