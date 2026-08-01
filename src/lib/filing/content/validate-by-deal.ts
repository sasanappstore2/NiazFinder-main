import {
  DEAL_FORBIDDEN_FINANCIAL,
  DEAL_REQUIRED_FINANCIAL,
  type FilingDealType,
  type FilingPropertyKind,
  isFilingDealType,
} from '@/lib/filing/schema/attribute-schema';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';

export type ExtendedValidationIssue =
  | 'missing_neighborhood'
  | 'missing_file_code'
  | 'missing_price'
  | 'weak_title'
  | 'missing_deposit'
  | 'missing_monthly_rent'
  | 'missing_price_per_meter'
  | 'missing_area'
  | 'deal_price_mismatch'
  | 'forbidden_deposit_on_sell'
  | 'forbidden_rent_on_full_rahn';

function hasMoney(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && value !== '0');
}

export function validateListingByDeal(row: Partial<ScrapedFilingRow>): string[] {
  const issues: string[] = [];
  const deal = isFilingDealType(row.dealType) ? row.dealType : null;
  const kind = row.propertyKind as FilingPropertyKind | null;

  if (!row.fileCode?.trim() && !row.externalId?.trim()) issues.push('missing_file_code');
  if ((row.title?.trim().length ?? 0) < 6) issues.push('weak_title');
  if (!row.neighborhood?.trim() && !row.location?.trim()) issues.push('missing_neighborhood');

  if (!deal) {
    if (!hasMoney(row.price) && !hasMoney(row.deposit) && !hasMoney(row.monthlyRent)) {
      issues.push('missing_price');
    }
    return issues;
  }

  for (const field of DEAL_REQUIRED_FINANCIAL[deal]) {
    const val = row[field as keyof ScrapedFilingRow];
    if (!hasMoney(typeof val === 'string' ? val : null)) {
      if (field === 'price') issues.push('missing_price');
      if (field === 'deposit') issues.push('missing_deposit');
      if (field === 'monthlyRent') issues.push('missing_monthly_rent');
    }
  }

  for (const field of DEAL_FORBIDDEN_FINANCIAL[deal]) {
    const val = row[field as keyof ScrapedFilingRow];
    if (hasMoney(typeof val === 'string' ? val : null)) {
      if (field === 'deposit') issues.push('forbidden_deposit_on_sell');
      if (field === 'monthlyRent') issues.push('forbidden_rent_on_full_rahn');
      if (field === 'price') issues.push('deal_price_mismatch');
    }
  }

  if (deal === 'sell' && !hasMoney(row.pricePerMeter)) {
    issues.push('missing_price_per_meter');
  }

  if (kind !== 'land' && !row.area?.trim()) {
    issues.push('missing_area');
  }

  return issues;
}

export function isCriticalValidationIssue(issue: string): boolean {
  return [
    'missing_file_code',
    'weak_title',
    'missing_neighborhood',
    'missing_price',
    'missing_deposit',
    'missing_monthly_rent',
    'deal_price_mismatch',
    'forbidden_deposit_on_sell',
    'forbidden_rent_on_full_rahn',
  ].includes(issue);
}
