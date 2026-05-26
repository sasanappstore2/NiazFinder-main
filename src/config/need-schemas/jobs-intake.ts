import type { IntentSchema, IntentType } from '@/contracts/need-intake';

export function buildJobsIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'استخدام',
    fields: [
      {
        key: 'roleType',
        type: 'chips',
        label: 'نوع آگهی',
        required: true,
        options: [
          { value: 'hiring', label: 'استخدام نیرو' },
          { value: 'seeking', label: 'جستجوی کار' },
        ],
      },
      {
        key: 'jobTitle',
        type: 'text',
        label: 'عنوان شغل / تخصص',
        placeholder: 'مثلاً توسعه‌دهنده فرانت، حسابدار…',
        required: true,
      },
      {
        key: 'employmentType',
        type: 'chips',
        label: 'نوع همکاری',
        options: [
          { value: 'full', label: 'تمام‌وقت' },
          { value: 'part', label: 'پاره‌وقت' },
          { value: 'remote', label: 'دورکاری' },
          { value: 'project', label: 'پروژه‌ای' },
          { value: 'intern', label: 'کارآموزی' },
        ],
      },
      {
        key: 'salaryMin',
        type: 'price',
        label: 'حقوق از (تومان)',
        showIf: { field: 'roleType', equals: 'hiring' },
      },
      {
        key: 'salaryMax',
        type: 'price',
        label: 'حقوق تا (تومان)',
        showIf: { field: 'roleType', equals: 'hiring' },
      },
      {
        key: 'experience',
        type: 'chips',
        label: 'سابقه کار',
        showIf: { field: 'roleType', equals: 'seeking' },
        options: [
          { value: 'junior', label: 'کمتر از ۲ سال' },
          { value: 'mid', label: '۲ تا ۵ سال' },
          { value: 'senior', label: 'بیش از ۵ سال' },
        ],
      },
      {
        key: 'location',
        type: 'location',
        label: 'شهر محل کار',
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'شرح موقعیت / مهارت‌ها',
        required: false,
      },
    ],
  };
}
