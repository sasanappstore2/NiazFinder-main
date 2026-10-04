import {
  buildDivarHypotheticalNeed,
  DIVAR_HYPOTHETICAL_NEED_TASK,
  type DivarHypotheticalNeed,
} from './divar-hypothetical-need';

export const DIVAR_HYPOTHETICAL_NEED_V6_TASK = 'divar-counterfactual-post-need-proposal/v6';

const LONG_TERM_RENT_CATEGORIES = new Set([
  'apartment-rent',
  'villa-rent',
  'land-rent',
  'shop-rent',
  'office-rent',
  'industrial-rent',
]);

const EXPLICIT_RENT_MODES: Readonly<Record<string, { value: string; wording: string }>> = {
  rent_monthly: { value: 'rent_monthly', wording: 'اجارهٔ ماهانه' },
  rent_rahn_full: { value: 'rent_rahn_full', wording: 'رهن کامل' },
  rent_rahn_ejare: { value: 'rent_rahn_ejare', wording: 'رهن و اجاره' },
};

type DivarHypotheticalNeedV6 = Omit<
  DivarHypotheticalNeed,
  'taskType' | 'schemaVersion' | 'exampleId' | 'state' | 'generation'
> & {
  taskType: typeof DIVAR_HYPOTHETICAL_NEED_V6_TASK;
  schemaVersion: 6;
  exampleId: string;
  state: string;
  generation: Omit<DivarHypotheticalNeed['generation'], 'version' | 'disclaimer'> & {
    version: 6;
    disclaimer: string;
    transactionModePolicy: string;
  };
};

/**
 * Version 6 preserves explicit Divar rent-mode facts in the counterfactual
 * request proposal. It does not transfer rent/deposit amounts or claim that
 * the seller's terms are a real seeker's preferences.
 */
export function buildDivarHypotheticalNeedV6(row: Record<string, any>): DivarHypotheticalNeedV6 | null {
  const v5 = buildDivarHypotheticalNeed(row);
  if (!v5) return null;

  const categorySlug = String(row.typedDecisions?.offer_category?.value ?? '');
  if (!LONG_TERM_RENT_CATEGORIES.has(categorySlug)) {
    return {
      ...v5,
      taskType: DIVAR_HYPOTHETICAL_NEED_V6_TASK,
      schemaVersion: 6,
      exampleId: `${row.exampleId}:counterfactual-v6`,
      generation: {
        ...v5.generation,
        version: 6,
        transactionModePolicy: 'explicit_source_rent_mode_only_for_long_term_rent; unknown_when_missing_or_incompatible',
        disclaimer: 'فرضی/پیشنهادی؛ از آگهی عرضهٔ ملکی مشتق شده است و نیاز واقعی کاربر یا ترجیح اثبات‌شده نیست. نوع معامله فقط در صورت وجود شاهد ساختاری صریح حفظ شده است.',
      },
    };
  }

  const sourceMode = String(row.typedDecisions?.offer_transaction_type?.value ?? 'unknown');
  const explicitMode = EXPLICIT_RENT_MODES[sourceMode];
  const transaction = explicitMode ?? { value: 'unknown', wording: 'اجاره' };
  const state = transaction.wording === 'اجارهٔ ماهانه'
    ? v5.state
    : v5.state.replaceAll('اجارهٔ ماهانه', transaction.wording);
  const targetSource = explicitMode
    ? 'explicit_structured_offer_rent_mode_recast_as_hypothetical_need'
    : 'unknown_no_explicit_compatible_offer_rent_mode';

  return {
    ...v5,
    taskType: DIVAR_HYPOTHETICAL_NEED_V6_TASK,
    schemaVersion: 6,
    exampleId: `${row.exampleId}:counterfactual-v6`,
    state,
    targetDecisions: {
      ...v5.targetDecisions,
      transaction_type: {
        value: transaction.value,
        source: targetSource,
        humanReviewed: false,
      },
    },
    generation: {
      ...v5.generation,
      version: 6,
      transactionModePolicy: 'explicit_source_rent_mode_only_for_long_term_rent; unknown_when_missing_or_incompatible',
      disclaimer: 'فرضی/پیشنهادی؛ از آگهی عرضهٔ ملکی مشتق شده است و نیاز واقعی کاربر یا ترجیح اثبات‌شده نیست. نوع معامله فقط در صورت وجود شاهد ساختاری صریح حفظ شده است.',
    },
  };
}

// Keep the import visible in the versioned contract: callers can assert the
// predecessor task without accidentally treating v5 data as v6 data.
export const DIVAR_HYPOTHETICAL_NEED_V6_PREDECESSOR_TASK = DIVAR_HYPOTHETICAL_NEED_TASK;
