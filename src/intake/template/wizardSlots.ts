import type { FieldSchema } from '@/contracts/need-intake';
import type { IntakeFieldMeta } from '@/intake/template/types';
import {
  INTAKE_URGENCY_OPTIONS,
  INTAKE_WHEN_OPTIONS,
} from '@/lib/need-intake/intake-timing-options';

const TRANSACTION_OPTIONS = [
  { value: 'RENT', label: 'اجاره' },
  { value: 'BUY', label: 'خرید' },
  { value: 'FULL_DEPOSIT', label: 'رهن کامل' },
  { value: 'DEPOSIT_AND_RENT', label: 'رهن و اجاره' },
] as const;

export const WIZARD_SLOT_SCHEMAS: Record<string, FieldSchema> = {
  category: {
    key: 'category',
    type: 'category',
    label: 'دسته‌بندی',
    required: true,
  },
  subcategory: {
    key: 'subcategory',
    type: 'text',
    label: '',
    required: false,
  },
  city: {
    key: 'city',
    type: 'city',
    label: 'شهر',
    required: true,
  },
  neighborhood: {
    key: 'neighborhood',
    type: 'neighborhood',
    label: 'محله / منطقه',
    required: true,
  },
  mapPin: {
    key: 'mapPin',
    type: 'mapPin',
    label: '',
    required: false,
  },
  transactionType: {
    key: 'transactionType',
    type: 'select',
    label: 'نوع معامله',
    required: true,
    options: [...TRANSACTION_OPTIONS],
  },
  budget: {
    key: 'budget',
    type: 'price',
    label: 'بودجه (تومان)',
    placeholder: 'سقف بودجه',
    required: false,
    // Rent-family deals replace the generic ceiling with dedicated rahn /
    // monthly-rent fields; BUY/SELL (or no deal yet) keep the generic budget.
    showIfIn: {
      field: 'dealType',
      values: ['', 'BUY', 'SELL', 'buy', 'sell'],
    },
  },
  rahnAmount: {
    key: 'rahnAmount',
    type: 'price',
    label: 'مبلغ رهن (تومان)',
    placeholder: 'مثلاً ۲ میلیارد',
    required: false,
    showIfIn: {
      field: 'dealType',
      values: ['FULL_DEPOSIT', 'DEPOSIT_AND_RENT', 'rent_rahn_full', 'rent_rahn_ejare'],
    },
  },
  monthlyRent: {
    key: 'monthlyRent',
    type: 'price',
    label: 'اجاره ماهانه (تومان)',
    placeholder: 'مثلاً ۳۰ میلیون',
    required: false,
    showIfIn: {
      field: 'dealType',
      values: ['RENT', 'DEPOSIT_AND_RENT', 'rent_monthly', 'rent_rahn_ejare'],
    },
  },
  area: {
    key: 'area',
    type: 'number',
    label: 'متراژ (متر)',
    placeholder: '120',
    required: false,
  },
  rooms: {
    key: 'rooms',
    type: 'number',
    label: 'تعداد خواب',
    placeholder: '2',
    required: false,
  },
  description: {
    key: 'description',
    type: 'textarea',
    label: 'شرح خدمت',
    placeholder: 'توضیح کوتاه از نوع کار یا مشکل',
    required: false,
  },
  urgency: {
    key: 'urgency',
    type: 'chips',
    label: 'درجه فوریت',
    required: false,
    options: [...INTAKE_URGENCY_OPTIONS],
  },
  when: {
    key: 'when',
    type: 'chips',
    label: 'تا چه زمانی نیاز دارید؟',
    helpText: 'برای ارائه‌دهندگان مشخص می‌شود چقدر فوری است و چه مهلتی دارید.',
    required: false,
    options: [...INTAKE_WHEN_OPTIONS],
  },
};

const ENTITY_KEYS = new Set([
  'city',
  'neighborhood',
  'mapPin',
  'transactionType',
  'budget',
  'rahnAmount',
  'monthlyRent',
  'area',
  'rooms',
  'category',
  'subcategory',
]);

export function wizardSlotToMeta(
  key: string,
  sectionKey?: string
): IntakeFieldMeta | null {
  const schema = WIZARD_SLOT_SCHEMAS[key];
  if (!schema) return null;
  return {
    ...schema,
    sectionKey,
    storage: ENTITY_KEYS.has(key) ? 'entity' : 'answers',
  };
}
