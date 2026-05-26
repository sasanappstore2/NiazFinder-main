import type { IntentSchema, IntentType } from '@/contracts/need-intake';

export function buildSocialIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'اجتماعی',
    fields: [
      {
        key: 'socialType',
        type: 'chips',
        label: 'نوع درخواست',
        required: true,
        options: [
          { value: 'lost', label: 'گم‌شده / پیدا شده' },
          { value: 'volunteer', label: 'داوطلبانه' },
          { value: 'event', label: 'رویداد' },
          { value: 'help', label: 'کمک / همکاری' },
        ],
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'توضیحات',
        placeholder: 'شرح کوتاه درخواست…',
        required: true,
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
        options: [
          { value: 'urgent', label: 'فوری' },
          { value: 'week', label: 'این هفته' },
          { value: 'flexible', label: 'انعطاف‌پذیر' },
        ],
      },
    ],
  };
}
