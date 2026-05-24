import type { IntentSchema } from '@/contracts/need-intake';

export const generalSchema: IntentSchema = {
  intentType: 'general',
  label: 'درخواست عمومی',
  fields: [
    {
      key: 'details',
      type: 'textarea',
      label: 'توضیح بیشتر درباره نیاز شما',
      placeholder: 'هر چیزی که فکر می‌کنید مهم است بنویسید…',
      required: true,
    },
    {
      key: 'budget',
      type: 'price',
      label: 'بودجه تقریبی (تومان)',
      required: false,
    },
    {
      key: 'location',
      type: 'location',
      label: 'شهر یا محله',
      required: false,
    },
    {
      key: 'urgent',
      type: 'chips',
      label: 'زمان‌بندی',
      required: false,
      options: [
        { value: 'urgent', label: 'فوری' },
        { value: 'week', label: 'این هفته' },
        { value: 'flexible', label: 'انعطاف‌پذیر' },
      ],
    },
  ],
};
