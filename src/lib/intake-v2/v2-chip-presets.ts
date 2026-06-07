import type { FieldOption } from '@/contracts/need-intake';

export const V2_SKIP_CHIP: FieldOption = {
  value: '__skip__',
  label: 'بعداً',
};

export function depositPresetChips(): FieldOption[] {
  return [
    { value: 'ودیعه زیر ۱۰۰ میلیون', label: 'زیر ۱۰۰M' },
    { value: 'ودیعه ۱۰۰ تا ۳۰۰ میلیون', label: '۱۰۰–۳۰۰M' },
    { value: 'ودیعه ۳۰۰ تا ۵۰۰ میلیون', label: '۳۰۰–۵۰۰M' },
    { value: 'ودیعه بالای ۵۰۰ میلیون', label: 'بالای ۵۰۰M' },
  ];
}

export function monthlyRentPresetChips(): FieldOption[] {
  return [
    { value: 'اجاره زیر ۲۰ میلیون', label: 'زیر ۲۰M' },
    { value: 'اجاره ۲۰ تا ۵۰ میلیون', label: '۲۰–۵۰M' },
    { value: 'اجاره ۵۰ تا ۱۰۰ میلیون', label: '۵۰–۱۰۰M' },
    { value: 'اجاره بالای ۱۰۰ میلیون', label: 'بالای ۱۰۰M' },
  ];
}

export function areaPresetChips(): FieldOption[] {
  return [
    { value: '۳۰ متر', label: '۳۰m' },
    { value: '۵۰ متر', label: '۵۰m' },
    { value: '۸۰ متر', label: '۸۰m' },
    { value: '۱۰۰ متر به بالا', label: '۱۰۰m+' },
  ];
}

export function floorPresetChips(): FieldOption[] {
  return [
    { value: 'همکف', label: 'همکف' },
    { value: 'طبقه ۱', label: 'طبقه ۱' },
    { value: 'طبقه ۲ به بالا', label: '۲+' },
  ];
}

export function roomsPresetChips(): FieldOption[] {
  return [
    { value: 'یک خواب', label: '۱ خواب' },
    { value: 'دو خواب', label: '۲ خواب' },
    { value: 'سه خواب', label: '۳ خواب' },
    { value: '۴ خواب و بیشتر', label: '۴+' },
  ];
}

export function budgetPresetChips(): FieldOption[] {
  return [
    { value: 'بودجه زیر ۵ میلیارد', label: 'زیر ۵B' },
    { value: 'بودجه ۵ تا ۱۰ میلیارد', label: '۵–۱۰B' },
    { value: 'بودجه ۱۰ تا ۲۰ میلیارد', label: '۱۰–۲۰B' },
    { value: 'بودجه بالای ۲۰ میلیارد', label: '۲۰B+' },
  ];
}

export function getPresetChipsForField(fieldKey: string): FieldOption[] | undefined {
  switch (fieldKey) {
    case 'deposit':
      return depositPresetChips();
    case 'monthlyRent':
      return monthlyRentPresetChips();
    case 'areaMin':
    case 'areaMax':
      return areaPresetChips();
    case 'floorMin':
    case 'floorMax':
      return floorPresetChips();
    case 'rooms':
      return roomsPresetChips();
    case 'budget':
      return budgetPresetChips();
    default:
      return undefined;
  }
}
