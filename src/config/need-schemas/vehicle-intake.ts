import type { IntentSchema, IntentType } from '@/contracts/need-intake';

export function buildVehicleIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'وسایل نقلیه',
    fields: [
      {
        key: 'dealType',
        type: 'chips',
        label: 'دنبال چه نوع معامله‌ای هستید؟',
        required: true,
        options: [
          { value: 'buy', label: 'خرید' },
          { value: 'sell', label: 'فروش' },
          { value: 'rent', label: 'اجاره' },
          { value: 'service', label: 'خدمات / تعمیر' },
          { value: 'parts', label: 'قطعات یدکی' },
        ],
      },
      {
        key: 'vehicleKind',
        type: 'chips',
        label: 'نوع وسیله',
        showIfIn: { field: 'dealType', values: ['buy', 'sell', 'rent'] },
        options: [
          { value: 'car', label: 'خودرو سواری' },
          { value: 'heavy', label: 'سنگین' },
          { value: 'motorcycle', label: 'موتور' },
          { value: 'classic', label: 'کلاسیک' },
        ],
      },
      {
        key: 'condition',
        type: 'chips',
        label: 'وضعیت',
        showIfIn: { field: 'dealType', values: ['buy', 'sell'] },
        options: [
          { value: 'new', label: 'نو' },
          { value: 'used', label: 'کارکرده' },
          { value: 'any', label: 'فرقی ندارد' },
        ],
      },
      {
        key: 'brand',
        type: 'text',
        label: 'برند و مدل',
        placeholder: 'مثلاً پژو ۲۰۶، پراید ۱۳۱…',
        showIfIn: { field: 'dealType', values: ['buy', 'sell', 'rent', 'parts'] },
      },
      {
        key: 'yearMin',
        type: 'number',
        label: 'حداقل سال ساخت',
        placeholder: 'مثلاً ۱۳۹۵',
        showIfIn: { field: 'dealType', values: ['buy', 'rent'] },
      },
      {
        key: 'budget',
        type: 'price',
        label: 'بودجه / قیمت (تومان)',
        showIfIn: { field: 'dealType', values: ['buy', 'sell', 'rent', 'parts'] },
      },
      {
        key: 'serviceType',
        type: 'textarea',
        label: 'شرح خدمات یا مشکل',
        placeholder: 'مثلاً تعویض لنت، سرویس دوره‌ای…',
        showIf: { field: 'dealType', equals: 'service' },
      },
      {
        key: 'location',
        type: 'location',
        label: 'شهر',
      },
      {
        key: 'details',
        type: 'textarea',
        label: 'توضیحات بیشتر',
        required: false,
      },
    ],
  };
}
