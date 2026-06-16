import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';

export function isPropertyParsedIntent(parsed: ParsedIntent): boolean {
  if (parsed.intentType.startsWith('property')) return true;
  if (parsed.intentType === 'real_estate_service') return true;
  if (parsed.categorySlug === 'construction-partnership') return true;
  if (parsed.rawText && isConstructionPartnershipText(parsed.rawText)) return true;
  const root = getCategoryPath(parsed.categorySlug)[0]?.slug;
  return root === 'real-estate';
}

export function isVehicleParsedIntent(parsed: ParsedIntent): boolean {
  if (parsed.intentType.startsWith('vehicle')) return true;
  const root = getCategoryPath(parsed.categorySlug)[0]?.slug;
  return root === 'vehicles';
}

export function shouldSkipNeighborhoodAutoResolve(parsed: ParsedIntent): boolean {
  return (
    isConstructionPartnershipText(parsed.rawText ?? '') ||
    parsed.categorySlug === 'construction-partnership' ||
    parsed.intentType === 'real_estate_service'
  );
}
