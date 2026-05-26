import type { IntentSchema, IntentType } from '@/contracts/need-intake';

/** Pre-sale / off-plan real estate projects. */
export function buildPreSaleIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'پیش‌فروش',
    fields: [
      {
        key: 'dealType',
        type: 'chips',
        label: 'نوع درخواست',
        required: true,
        options: [
          { value: 'buy', label: 'خرید واحد' },
          { value: 'sell', label: 'فروش / واگذاری' },
          { value: 'consult', label: 'مشاوره پیش‌فروش' },
        ],
      },
      {
        key: 'propertyKind',
        type: 'chips',
        label: 'نوع پروژه',
        options: [
          { value: 'apartment', label: 'آپارتمان' },
          { value: 'villa', label: 'ویلایی' },
          { value: 'commercial', label: 'تجاری' },
        ],
      },
      {
        key: 'projectName',
        type: 'text',
        label: 'نام پروژه (در صورت اطلاع)',
        required: false,
      },
      {
        key: 'location',
        type: 'location',
        label: 'شهر / منطقه',
        required: true,
      },
      {
        key: 'budget',
        type: 'price',
        label: 'بودجه تقریبی (تومان)',
        required: false,
      },
      {
        key: 'delivery',
        type: 'chips',
        label: 'زمان تحویل',
        options: [
          { value: 'under_1y', label: 'زیر ۱ سال' },
          { value: '1_2y', label: '۱ تا ۲ سال' },
          { value: '2y_plus', label: 'بیش از ۲ سال' },
          { value: 'flexible', label: 'مهم نیست' },
        ],
      },
    ],
  };
}
