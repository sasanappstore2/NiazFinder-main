import type {
  IntakeEntities,
  MissingFieldItem,
  TransactionType,
  WizardQuestion,
} from '@/intake/types';

const TRANSACTION_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: 'BUY', label: 'خرید' },
  { value: 'RENT', label: 'اجاره' },
  { value: 'FULL_DEPOSIT', label: 'رهن کامل' },
  { value: 'DEPOSIT_AND_RENT', label: 'رهن و اجاره' },
  { value: 'DAILY_RENT', label: 'اجاره روزانه' },
];

function questionForField(field: string): WizardQuestion | null {
  switch (field) {
    case 'category':
      return {
        field: 'category',
        type: 'singleChoice',
        label: 'دسته‌بندی نیاز شما چیست؟',
        required: true,
      };
    case 'city':
      return {
        field: 'city',
        type: 'location',
        label: 'در کدام شهر؟',
        required: true,
      };
    case 'neighborhood':
      return {
        field: 'neighborhood',
        type: 'singleChoice',
        label: 'محله یا محدوده مدنظر؟',
        required: false,
      };
    case 'transactionType':
      return {
        field: 'transactionType',
        type: 'singleChoice',
        label: 'نوع معامله چیست؟',
        required: true,
        options: TRANSACTION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      };
    case 'area':
      return {
        field: 'area',
        type: 'number',
        label: 'متراژ تقریبی (متر مربع)',
        required: false,
      };
    case 'rooms':
      return {
        field: 'rooms',
        type: 'number',
        label: 'چند خواب؟',
        required: false,
      };
    case 'budget':
      return {
        field: 'budget',
        type: 'number',
        label: 'بودجه تقریبی',
        required: false,
      };
    default:
      return null;
  }
}

export function buildNextQuestion(
  entities: IntakeEntities,
  missingFields?: MissingFieldItem[]
): WizardQuestion | null {
  const sortedMissing = [...(missingFields ?? [])].sort((a, b) => b.priority - a.priority);
  for (const item of sortedMissing) {
    const question = questionForField(item.field);
    if (question) {
      return question;
    }
  }
  return null;
}
