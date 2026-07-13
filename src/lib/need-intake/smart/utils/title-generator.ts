/**
 * Auto title/description from SmartExtractionResult (Claude backlog #2).
 */

import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

const CATEGORY_LABELS: Record<string, string> = {
  'apartment-rent': 'اجاره آپارتمان',
  'apartment-sale': 'خرید آپارتمان',
  apartment: 'آپارتمان',
  villa: 'ویلا',
  land: 'زمین',
  shop: 'مغازه',
  office: 'دفتر',
  warehouse: 'انبار',
  'real-estate': 'ملک',
  commercial: 'ملک تجاری',
  vehicles: 'خودرو',
  services: 'خدمات',
  jobs: 'استخدام',
};

const TX_LABELS: Record<string, string> = {
  RENT: 'اجاره',
  BUY: 'خرید',
  SELL: 'فروش',
  FULL_DEPOSIT: 'رهن کامل',
  DEPOSIT_AND_RENT: 'رهن و اجاره',
  DAILY_RENT: 'اجاره روزانه',
  HOURLY_RENT: 'اجاره ساعتی',
};

function formatToman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function categoryLabel(result: SmartExtractionResult): string | null {
  const key = result.category.subcategory || result.category.value;
  if (!key) {
    if (result.transaction.type && TX_LABELS[result.transaction.type]) {
      return TX_LABELS[result.transaction.type]!;
    }
    return null;
  }
  return CATEGORY_LABELS[key] || key;
}

/** Generate title from smart extraction (category/tx + neighborhood/city). */
export function generateSmartTitle(result: SmartExtractionResult | null | undefined): string | null {
  if (!result) return null;
  const cat = categoryLabel(result);
  const loc =
    result.location.neighborhood?.trim() ||
    result.location.city?.trim() ||
    null;
  if (!cat && !loc) return null;

  const parts: string[] = [];
  if (result.transaction.type && TX_LABELS[result.transaction.type] && !cat?.includes(TX_LABELS[result.transaction.type]!)) {
    parts.push(TX_LABELS[result.transaction.type]!);
  }
  if (cat) parts.push(cat);
  if (result.property.rooms) parts.push(`${result.property.rooms} خواب`);
  if (result.property.area) parts.push(`${result.property.area} متر`);
  if (loc) parts.push(`در ${loc}`);

  const title = parts.join(' ').replace(/\s+/g, ' ').trim();
  return title.length >= 4 ? title.slice(0, 80) : null;
}

/** Generate description from smart extraction (budget + amenities + urgency). */
export function generateSmartDescription(
  result: SmartExtractionResult | null | undefined,
  sourceText?: string
): string | null {
  if (!result) return null;
  const parts: string[] = [];

  const base = sourceText?.trim();
  if (base && base.length >= 8) {
    parts.push(base);
  }

  if (result.budget.depositAmount && result.budget.rentAmount) {
    parts.push(
      `رهن حدود ${formatToman(result.budget.depositAmount)} و اجاره ${formatToman(result.budget.rentAmount)} تومان`
    );
  } else if (result.budget.depositAmount) {
    parts.push(`رهن حدود ${formatToman(result.budget.depositAmount)} تومان`);
  } else if (result.budget.max) {
    parts.push(`بودجه حدود ${formatToman(result.budget.max)} تومان`);
  } else if (result.budget.min) {
    parts.push(`بودجه از ${formatToman(result.budget.min)} تومان`);
  }

  const amenities: string[] = [];
  if (result.property.hasParking) amenities.push('پارکینگ');
  if (result.property.hasElevator) amenities.push('آسانسور');
  if (result.property.hasStorage) amenities.push('انباری');
  if (amenities.length) parts.push(`امکانات: ${amenities.join('، ')}`);

  if (result.metadata.urgency === 'immediate') parts.push('فوری');
  else if (result.metadata.urgency === 'this_week') parts.push('این هفته');
  else if (result.metadata.urgency === 'this_month') parts.push('این ماه');

  if (parts.length === 0) return null;
  return parts.join(' — ').slice(0, 500);
}
