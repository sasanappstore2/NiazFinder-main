import type { IntentSchema } from '@/contracts/need-intake';

export const productSearchSchema: IntentSchema = {
  intentType: 'product_search',
  label: 'کالا',
  fields: [
    {
      key: 'productName',
      type: 'text',
      label: 'چه کالایی می‌خواهید؟',
      placeholder: 'مثلاً ps5، لپ‌تاپ…',
      required: true,
    },
    {
      key: 'condition',
      type: 'chips',
      label: 'نو یا کارکرده؟',
      options: [
        { value: 'new', label: 'نو' },
        { value: 'used', label: 'کارکرده' },
        { value: 'any', label: 'فرقی ندارد' },
      ],
    },
    {
      key: 'budget',
      type: 'price',
      label: 'بودجه',
      required: false,
    },
    {
      key: 'location',
      type: 'location',
      label: 'شهر',
      required: false,
    },
  ],
};
