import type { IntentSchema } from '@/contracts/need-intake';

export const serviceRequestSchema: IntentSchema = {
  intentType: 'service_request',
  label: 'درخواست خدمات',
  fields: [
    {
      key: 'serviceType',
      type: 'text',
      label: 'چه خدمتی نیاز دارید؟',
      placeholder: 'مثلاً تعمیر کولر، طراحی لوگو…',
      required: true,
    },
    {
      key: 'when',
      type: 'chips',
      label: 'چه زمانی نیاز دارید؟',
      options: [
        { value: 'today', label: 'امروز' },
        { value: 'week', label: 'این هفته' },
        { value: 'month', label: 'این ماه' },
        { value: 'flexible', label: 'مهم نیست' },
      ],
    },
    {
      key: 'budget',
      type: 'price',
      label: 'بودجه تقریبی',
      required: false,
    },
    {
      key: 'location',
      type: 'location',
      label: 'محل انجام کار',
      required: false,
    },
  ],
};
