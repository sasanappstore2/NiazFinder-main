import type { IntentSchema, IntentType } from '@/contracts/need-intake';

/** Advanced real-estate intake — buy, sell, rent, rahn kamel, rahn o ejare. */
export function buildPropertyIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'املاک',
    fields: [
      {
        key: 'dealType',
        type: 'chips',
        label: 'نوع معامله ملک چیست؟',
        helpText: 'رهن کامل یعنی فقط مبلغ رهن؛ رهن و اجاره یعنی ودیعه + اجاره ماهانه.',
        required: true,
        options: [
          { value: 'buy', label: 'خرید' },
          { value: 'sell', label: 'فروش' },
          { value: 'rent_monthly', label: 'اجاره ماهانه' },
          { value: 'rent_rahn_full', label: 'رهن کامل' },
          { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
        ],
      },
      {
        key: 'propertyKind',
        type: 'chips',
        label: 'نوع ملک',
        options: [
          { value: 'apartment', label: 'آپارتمان' },
          { value: 'villa', label: 'خانه / ویلا' },
          { value: 'land', label: 'زمین' },
          { value: 'office', label: 'دفتر کار' },
          { value: 'shop', label: 'مغازه' },
          { value: 'industrial', label: 'صنعتی' },
        ],
      },
      {
        key: 'rooms',
        type: 'chips',
        label: 'تعداد خواب',
        showIfIn: { field: 'propertyKind', values: ['apartment', 'villa'] },
        options: [
          { value: '1', label: '۱ خواب' },
          { value: '2', label: '۲ خواب' },
          { value: '3', label: '۳ خواب' },
          { value: '4+', label: '۴ خواب و بیشتر' },
          { value: 'studio', label: 'سوئیت / بدون خواب' },
        ],
      },
      {
        key: 'areaMin',
        type: 'number',
        label: 'حداقل متراژ (متر مربع)',
        placeholder: 'مثلاً ۸۰',
        showIfIn: { field: 'propertyKind', values: ['apartment', 'villa', 'office', 'shop'] },
      },
      {
        key: 'location',
        type: 'location',
        label: 'شهر و محله',
        placeholder: 'مثلاً تهران، غرب، سعادت‌آباد',
        required: false,
      },
      {
        key: 'budget',
        type: 'price',
        label: 'بودجه خرید یا قیمت فروش (تومان)',
        showIfIn: { field: 'dealType', values: ['buy', 'sell'] },
      },
      {
        key: 'rahnAmount',
        type: 'price',
        label: 'مبلغ رهن (تومان)',
        helpText: 'برای رهن کامل یا بخش رهن در «رهن و اجاره».',
        showIfIn: { field: 'dealType', values: ['rent_rahn_full', 'rent_rahn_ejare'] },
      },
      {
        key: 'deposit',
        type: 'price',
        label: 'ودیعه (تومان)',
        showIfIn: { field: 'dealType', values: ['rent_rahn_ejare', 'rent_monthly'] },
      },
      {
        key: 'monthlyRent',
        type: 'price',
        label: 'اجاره ماهانه (تومان)',
        showIfIn: { field: 'dealType', values: ['rent_monthly', 'rent_rahn_ejare'] },
      },
      {
        key: 'amenities',
        type: 'chips',
        label: 'امکانات مهم',
        showIfIn: { field: 'propertyKind', values: ['apartment', 'villa'] },
        options: [
          { value: 'parking', label: 'پارکینگ' },
          { value: 'elevator', label: 'آسانسور' },
          { value: 'storage', label: 'انباری' },
          { value: 'furnished', label: 'مبله' },
          { value: 'any', label: 'مهم نیست' },
        ],
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'توضیحات تکمیلی',
        placeholder: 'طبقه، سال ساخت، شرایط ویژه…',
        required: false,
      },
    ],
  };
}
