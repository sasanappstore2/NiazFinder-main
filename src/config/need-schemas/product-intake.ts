import type { IntentSchema, IntentType } from '@/contracts/need-intake';

export function buildProductIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'کالا',
    fields: [
      {
        key: 'dealType',
        type: 'chips',
        label: 'خرید یا فروش؟',
        required: true,
        options: [
          { value: 'buy', label: 'می‌خرم' },
          { value: 'sell', label: 'می‌فروشم' },
        ],
      },
      {
        key: 'productName',
        type: 'text',
        label: 'نام کالا',
        placeholder: 'مثلاً آیفون ۱۵، ps5، یخچال سامسونگ…',
        required: true,
      },
      {
        key: 'condition',
        type: 'chips',
        label: 'وضعیت کالا',
        options: [
          { value: 'new', label: 'نو' },
          { value: 'like_new', label: 'در حد نو' },
          { value: 'used', label: 'کارکرده' },
          { value: 'any', label: 'فرقی ندارد' },
        ],
      },
      {
        key: 'budget',
        type: 'price',
        label: 'بودجه / قیمت (تومان)',
      },
      {
        key: 'location',
        type: 'location',
        label: 'شهر',
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'جزئیات (رنگ، گارانتی، مدل دقیق…)',
        required: false,
      },
    ],
  };
}
