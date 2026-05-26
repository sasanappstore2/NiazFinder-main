import type { IntentSchema, IntentType } from '@/contracts/need-intake';

export function buildServicesIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'خدمات',
    fields: [
      {
        key: 'serviceCategory',
        type: 'chips',
        label: 'دسته خدمات',
        required: true,
        options: [
          { value: 'repairs', label: 'تعمیرات' },
          { value: 'cleaning', label: 'نظافت' },
          { value: 'transport', label: 'حمل و نقل' },
          { value: 'beauty', label: 'زیبایی و سلامت' },
          { value: 'education', label: 'آموزش' },
          { value: 'events', label: 'مراسم' },
          { value: 'plumbing', label: 'لوله‌کشی' },
          { value: 'moving', label: 'اسباب‌کشی' },
          { value: 'electrical', label: 'برق‌کاری' },
          { value: 'painting', label: 'نقاشی' },
          { value: 'medical', label: 'درمانی' },
          { value: 'legal', label: 'حقوقی' },
          { value: 'it', label: 'فناوری' },
          { value: 'other', label: 'سایر' },
        ],
      },
      {
        key: 'serviceType',
        type: 'textarea',
        label: 'دقیقاً چه خدمتی نیاز دارید؟',
        placeholder: 'مثلاً تعمیر کولر اسپلیت، طراحی لوگو…',
        required: true,
      },
      {
        key: 'when',
        type: 'chips',
        label: 'زمان مورد نیاز',
        options: [
          { value: 'today', label: 'امروز / فوری' },
          { value: 'week', label: 'این هفته' },
          { value: 'month', label: 'این ماه' },
          { value: 'flexible', label: 'انعطاف‌پذیر' },
        ],
      },
      {
        key: 'budget',
        type: 'price',
        label: 'بودجه تقریبی',
      },
      {
        key: 'location',
        type: 'location',
        label: 'محل انجام کار',
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'توضیحات تکمیلی',
        required: false,
      },
    ],
  };
}
