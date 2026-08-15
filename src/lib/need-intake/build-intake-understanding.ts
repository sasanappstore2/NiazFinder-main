import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import type { FieldState } from '@/intake/intelligence-engine/types';
import {
  RULES_CATEGORY_MIN_CONFIDENCE,
  RULES_DISAMBIG_MIN_CONFIDENCE,
} from '@/intake/rules/config';
import {
  COMPOSE_AUTO_APPLY_MIN_CONFIDENCE,
  NEIGHBORHOOD_PREFILL_MIN_CONFIDENCE,
  UNDERSTANDING_LOCATION_MIN_CONFIDENCE,
} from '@/lib/need-intake/compose-auto-apply';

export interface IntakeUnderstandingHighlight {
  key: string;
  label: string;
  value: string;
}

export interface IntakeUnderstandingView {
  summary: string;
  highlights: IntakeUnderstandingHighlight[];
  aiInvoked: boolean;
  analysisMode: 'ai' | 'rules';
}

/** Category chips / auto-apply — only when the engine is clearly sure. */
export const UNDERSTANDING_CATEGORY_MIN_CONFIDENCE = RULES_DISAMBIG_MIN_CONFIDENCE;
/** Location auto-apply — parity with category (RFC-0004). */
export { UNDERSTANDING_LOCATION_MIN_CONFIDENCE };
/** Other field chips (budget, …) — display only; auto-apply uses COMPOSE gate. */
export const UNDERSTANDING_FIELD_MIN_CONFIDENCE = RULES_CATEGORY_MIN_CONFIDENCE;
export { COMPOSE_AUTO_APPLY_MIN_CONFIDENCE };

const FIELD_LABELS: Record<string, string> = {
  categorySlug: '\u062F\u0633\u062A\u0647',
  subcategorySlug: '\u0632\u06CC\u0631\u062F\u0633\u062A\u0647',
  city: '\u0634\u0647\u0631',
  neighborhood: '\u0645\u062D\u0644\u0647',
  transactionType: '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647',
  rahnAmount: '\u0631\u0647\u0646',
  monthlyRent: '\u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u0627\u0646\u0647',
  deposit: '\u0648\u062F\u06CC\u0639\u0647',
  budgetMin: '\u0628\u0648\u062F\u0698\u0647 (\u062D\u062F\u0627\u0642\u0644)',
  budgetMax: '\u0628\u0648\u062F\u0698\u0647 (\u062D\u062F\u0627\u06A9\u062B\u0631)',
  rooms: '\u0627\u062A\u0627\u0642',
  area: '\u0645\u062A\u0631\u0627\u0698',
};

const TRANSACTION_LABELS: Record<string, string> = {
  BUY: '\u062E\u0631\u06CC\u062F',
  buy: '\u062E\u0631\u06CC\u062F',
  SELL: '\u0641\u0631\u0648\u0634',
  sell: '\u0641\u0631\u0648\u0634',
  RENT: '\u0627\u062C\u0627\u0631\u0647',
  rent: '\u0627\u062C\u0627\u0631\u0647',
  rent_monthly: '\u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u0627\u0646\u0647',
  rent_rahn_full: '\u0631\u0647\u0646 \u06A9\u0627\u0645\u0644',
  rent_rahn_ejare: '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647',
  FULL_DEPOSIT: '\u0631\u0647\u0646 \u06A9\u0627\u0645\u0644',
  DEPOSIT_AND_RENT: '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647',
  DAILY_RENT: '\u0627\u062C\u0627\u0631\u0647 \u0631\u0648\u0632\u0627\u0646\u0647',
};

function minConfidenceForKey(key: string): number {
  if (key === 'categorySlug' || key === 'subcategorySlug') {
    return UNDERSTANDING_CATEGORY_MIN_CONFIDENCE;
  }
  if (key === 'city' || key === 'citySlug') {
    return UNDERSTANDING_LOCATION_MIN_CONFIDENCE;
  }
  if (key === 'neighborhood' || key === 'neighborhoodSlug') {
    return NEIGHBORHOOD_PREFILL_MIN_CONFIDENCE;
  }
  return UNDERSTANDING_FIELD_MIN_CONFIDENCE;
}

function formatFieldValue(key: string, value: unknown): string {
  if (value == null) return '';
  if (key === 'categorySlug' || key === 'subcategorySlug') {
    const slug = String(value).trim();
    return slug ? categorySuggestionLabelFromSlug(slug) : '';
  }
  if (key === 'transactionType') {
    const raw = String(value).trim();
    return TRANSACTION_LABELS[raw] ?? raw;
  }
  if (typeof value === 'number') {
    if (
      key.startsWith('budget') ||
      key === 'rahnAmount' ||
      key === 'monthlyRent' ||
      key === 'deposit'
    ) {
      return `${value.toLocaleString('fa-IR')} \u062A\u0648\u0645\u0627\u0646`;
    }
    return String(value);
  }
  return String(value).trim();
}

function highlightFromMeta(
  key: string,
  meta: FieldState | undefined
): IntakeUnderstandingHighlight | null {
  if (!meta?.value) return null;
  if ((meta.confidence ?? 0) < minConfidenceForKey(key)) return null;
  const value = formatFieldValue(key, meta.value);
  if (!value) return null;
  return {
    key,
    label: FIELD_LABELS[key] ?? key,
    value,
  };
}

function isDepositRentDeal(meta: Record<string, FieldState>): boolean {
  const tx = String(meta.transactionType?.value ?? '').trim();
  return (
    tx === 'DEPOSIT_AND_RENT' ||
    tx === 'FULL_DEPOSIT' ||
    tx === 'rent_rahn_ejare' ||
    tx === 'rent_rahn_full' ||
    tx === 'DAILY_RENT'
  );
}

/** Build human-readable understanding for compose-step UI. */
export function buildIntakeUnderstanding(input: {
  intentGist: string | null;
  fieldMeta: Record<string, FieldState> | null;
  aiInvoked?: boolean;
  analysisMode?: 'ai' | 'rules';
}): IntakeUnderstandingView {
  const highlights: IntakeUnderstandingHighlight[] = [];
  const meta = input.fieldMeta ?? {};
  const rentDeal = isDepositRentDeal(meta);
  const order = (
    rentDeal
      ? ([
          'categorySlug',
          'subcategorySlug',
          'transactionType',
          'city',
          'neighborhood',
          'rahnAmount',
          'monthlyRent',
          'deposit',
          'budgetMax',
          'budgetMin',
          'rooms',
          'area',
        ] as const)
      : ([
          'categorySlug',
          'subcategorySlug',
          'transactionType',
          'city',
          'neighborhood',
          'budgetMax',
          'budgetMin',
          'rahnAmount',
          'monthlyRent',
          'rooms',
          'area',
        ] as const)
  );

  const seen = new Set<string>();
  const hasRahnOrRent = Boolean(meta.rahnAmount?.value || meta.monthlyRent?.value);

  for (const key of order) {
    // For رهن‌واجاره, prefer explicit rahn/rent chips over a lone generic budgetMax.
    if (rentDeal && hasRahnOrRent && (key === 'budgetMax' || key === 'budgetMin')) {
      continue;
    }
    const row = highlightFromMeta(key, meta[key]);
    if (!row || seen.has(row.value)) continue;
    if (key === 'subcategorySlug' && highlights.some((h) => h.key === 'categorySlug')) {
      const cat = highlights.find((h) => h.key === 'categorySlug');
      if (cat && row.value.includes(cat.value.split(' / ').pop() ?? '')) continue;
    }
    seen.add(row.value);
    highlights.push(row);
  }

  const gist = input.intentGist?.trim() || '';
  const summary =
    gist ||
    (highlights.length > 0
      ? `\u0628\u0647 \u0646\u0638\u0631 \u0645\u06CC\u200C\u0631\u0633\u062F ${highlights.map((h) => `${h.label}: ${h.value}`).join(' \u00B7 ')} \u0628\u0631\u0627\u06CC \u0634\u0645\u0627 \u0645\u0647\u0645 \u0627\u0633\u062A.`
      : '');

  return {
    summary,
    highlights,
    aiInvoked: Boolean(input.aiInvoked),
    analysisMode: input.analysisMode ?? (input.aiInvoked ? 'ai' : 'rules'),
  };
}
