import { toPersianDigits } from '@/lib/format/digits';
import type { FilingTemplateSpecKey } from '../schema/category-templates';
import { FILING_SPEC_LABELS } from '../schema/category-templates';
import type { FilingAmenities, FilingSourceMeta } from '../types';

export type FilingSpecCarrier = {
  floor: number | null;
  rooms: number | null;
  totalFloors: number | null;
  unitsCount: number | null;
  buildingAge: number | null;
  documentType: string | null;
  cabinet: string | null;
  flooring: string | null;
  wallCover: string | null;
  facade: string | null;
  orientation: string | null;
  heating: string | null;
  cooling: string | null;
  amenities: Pick<FilingAmenities, 'exchangeable'>;
  sourceMeta: Pick<FilingSourceMeta, 'plotWidth' | 'landUse' | 'frontage' | 'commercialUse'>;
};

function specSuffix(key: FilingTemplateSpecKey): string {
  if (key === 'buildingAge') return ' سال ساخت';
  if (key === 'plotWidth' || key === 'frontage') return ' متر';
  return '';
}

function formatScalar(value: string | number | boolean | null | undefined, key: FilingTemplateSpecKey): string | null {
  if (value == null) return null;
  if (typeof value === 'boolean') {
    if (key === 'exchangeable') return value ? 'دارد' : 'ندارد';
    return value ? 'بله' : 'خیر';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return `${toPersianDigits(value)}${specSuffix(key)}`;
  }
  const trimmed = value.trim();
  return trimmed ? `${trimmed}${specSuffix(key)}` : null;
}

export function filingSpecValue(vm: FilingSpecCarrier, key: FilingTemplateSpecKey): string | null {
  switch (key) {
    case 'floor':
      return formatScalar(vm.floor, key);
    case 'totalFloors':
      return formatScalar(vm.totalFloors, key);
    case 'unitsCount':
      return formatScalar(vm.unitsCount, key);
    case 'rooms':
      return formatScalar(vm.rooms, key);
    case 'buildingAge':
      return formatScalar(vm.buildingAge, key);
    case 'documentType':
      return formatScalar(vm.documentType, key);
    case 'cabinet':
      return formatScalar(vm.cabinet, key);
    case 'flooring':
      return formatScalar(vm.flooring, key);
    case 'wallCover':
      return formatScalar(vm.wallCover, key);
    case 'facade':
      return formatScalar(vm.facade, key);
    case 'orientation':
      return formatScalar(vm.orientation, key);
    case 'heating':
      return formatScalar(vm.heating, key);
    case 'cooling':
      return formatScalar(vm.cooling, key);
    case 'exchangeable':
      return formatScalar(vm.amenities.exchangeable, key);
    case 'plotWidth':
      return formatScalar(vm.sourceMeta.plotWidth, key);
    case 'landUse':
      return formatScalar(vm.sourceMeta.landUse, key);
    case 'frontage':
      return formatScalar(vm.sourceMeta.frontage, key);
    case 'commercialUse':
      return formatScalar(vm.sourceMeta.commercialUse, key);
    default:
      return null;
  }
}

export function filingSpecRow(vm: FilingSpecCarrier, key: FilingTemplateSpecKey) {
  return {
    key,
    label: FILING_SPEC_LABELS[key],
    value: filingSpecValue(vm, key),
  };
}
