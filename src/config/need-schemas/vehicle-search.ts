import type { IntentSchema } from '@/contracts/need-intake';

export const vehicleSearchSchema: IntentSchema = {
  intentType: 'vehicle_search',
  label: 'خودرو',
  fields: [
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
      key: 'brand',
      type: 'text',
      label: 'برند یا مدل مد نظر',
      placeholder: 'مثلاً پژو ۲۰۶، پراید…',
      required: false,
    },
    {
      key: 'budget',
      type: 'price',
      label: 'بودجه حداکثر',
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
