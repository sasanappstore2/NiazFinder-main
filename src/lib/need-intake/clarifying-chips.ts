import type { FieldOption, ParsedIntent } from '@/contracts/need-intake';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import {
  classifyVertical,
  isVerticalConfident,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

export interface ClarifyingChipSet {
  fieldKey: string;
  label: string;
  options: FieldOption[];
}

export function getClarifyingChipSet(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  classification?: VerticalClassification
): ClarifyingChipSet | null {
  const cls = classification ?? classifyVertical(parsed.rawText);
  const root = getRootCategorySlug(parsed.categorySlug);
  const propertyStrong =
    cls.vertical === 'real-estate' &&
    (isVerticalConfident(cls) || parsed.intentType.startsWith('property'));

  if (!answers.dealType && propertyStrong) {
    return {
      fieldKey: 'dealType',
      label: 'نوع معامله ملک',
      options: [
        { value: 'buy', label: 'خرید' },
        { value: 'sell', label: 'فروش' },
        { value: 'rent_monthly', label: 'اجاره ماهانه' },
        { value: 'rent_rahn_full', label: 'رهن کامل' },
        { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
      ],
    };
  }

  if (
    !answers.dealType &&
    (root === 'real-estate' ||
      parsed.intentType.startsWith('property') ||
      parsed.categorySlug.includes('apartment') ||
      parsed.categorySlug.includes('rent') ||
      parsed.categorySlug.includes('sale'))
  ) {
    return {
      fieldKey: 'dealType',
      label: 'نوع معامله ملک',
      options: [
        { value: 'buy', label: 'خرید' },
        { value: 'sell', label: 'فروش' },
        { value: 'rent_monthly', label: 'اجاره ماهانه' },
        { value: 'rent_rahn_full', label: 'رهن کامل' },
        { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
      ],
    };
  }

  if (!answers.dealType && (root === 'vehicles' || parsed.intentType.startsWith('vehicle'))) {
    return {
      fieldKey: 'dealType',
      label: 'نوع نیاز خودرو',
      options: [
        { value: 'buy', label: 'خرید' },
        { value: 'sell', label: 'فروش' },
        { value: 'rent', label: 'اجاره' },
        { value: 'service', label: 'خدمات / تعمیر' },
        { value: 'parts', label: 'قطعات' },
      ],
    };
  }

  if (
    !answers.dealType &&
    (parsed.intentType === 'product_search' ||
      parsed.intentType === 'product_listing' ||
      ['electronics', 'home-appliances', 'personal-items', 'entertainment'].includes(root))
  ) {
    return {
      fieldKey: 'dealType',
      label: 'خرید یا فروش؟',
      options: [
        { value: 'buy', label: 'می‌خرم' },
        { value: 'sell', label: 'می‌فروشم' },
      ],
    };
  }

  if (parsed.intentType === 'job_search' || root === 'jobs') {
    if (!answers.roleType) {
      return {
        fieldKey: 'roleType',
        label: 'نوع آگهی شغلی',
        options: [
          { value: 'seeking', label: 'کارجو هستم' },
          { value: 'hiring', label: 'استخدام می‌کنم' },
        ],
      };
    }
  }

  if (
    !answers.serviceCategory &&
    (root === 'services' || parsed.intentType === 'service_request') &&
    !propertyStrong &&
    cls.vertical === 'services'
  ) {
    return {
      fieldKey: 'serviceCategory',
      label: 'دسته خدمات',
      options: [
        { value: 'repairs', label: 'تعمیرات' },
        { value: 'cleaning', label: 'نظافت' },
        { value: 'transport', label: 'حمل‌ونقل' },
        { value: 'beauty', label: 'زیبایی' },
        { value: 'education', label: 'آموزش' },
        { value: 'plumbing', label: 'لوله‌کشی' },
        { value: 'moving', label: 'اسباب‌کشی' },
        { value: 'electrical', label: 'برق‌کاری' },
        { value: 'painting', label: 'نقاشی' },
        { value: 'medical', label: 'درمانی' },
        { value: 'legal', label: 'حقوقی' },
        { value: 'it', label: 'فناوری' },
        { value: 'other', label: 'سایر' },
      ],
    };
  }

  if (root === 'social' && !answers.socialType) {
    return {
      fieldKey: 'socialType',
      label: 'نوع درخواست اجتماعی',
      options: [
        { value: 'lost', label: 'گم‌شده / پیدا شده' },
        { value: 'volunteer', label: 'داوطلبانه' },
        { value: 'event', label: 'رویداد' },
        { value: 'help', label: 'کمک / همکاری' },
      ],
    };
  }

  return null;
}
