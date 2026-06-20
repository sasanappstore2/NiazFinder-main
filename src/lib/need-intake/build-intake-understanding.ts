import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import type { FieldState } from '@/intake/intelligence-engine/types';

export interface IntakeUnderstandingHighlight {
  key: string;
  label: string;
  value: string;
}

export interface IntakeUnderstandingView {
  summary: string;
  highlights: IntakeUnderstandingHighlight[];
  aiInvoked: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  categorySlug: '\u062F\u0633\u062A\u0647',
  subcategorySlug: '\u0632\u06CC\u0631\u062F\u0633\u062A\u0647',
  city: '\u0634\u0647\u0631',
  neighborhood: '\u0645\u062D\u0644\u0647',
  transactionType: '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647',
  budgetMin: '\u0628\u0648\u062F\u0698\u0647 (\u062D\u062F\u0627\u0642\u0644)',
  budgetMax: '\u0628\u0648\u062F\u0698\u0647 (\u062D\u062F\u0627\u0643\u062B\u0631)',
  rooms: '\u0627\u062A\u0627\u0642',
  area: '\u0645\u062A\u0631\u0627\u0698',
};

const TRANSACTION_LABELS: Record<string, string> = {
  BUY: '\u062E\u0631\u06CC\u062F',
  buy: '\u062E\u0631\u06CC\u062F',
  SELL: '\u0641\u0631\u0648\u0634',
  sell: '\u0641\u0631\u0648\u0634',
  rent: '\u0627\u062C\u0627\u0631\u0647',
  rent_monthly: '\u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u0627\u0646\u0647',
  rent_rahn_full: '\u0631\u0647\u0646 \u06A9\u0627\u0645\u0644',
  rent_rahn_ejare: '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647',
};

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
    if (key.startsWith('budget')) {
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
  const value = formatFieldValue(key, meta.value);
  if (!value) return null;
  return {
    key,
    label: FIELD_LABELS[key] ?? key,
    value,
  };
}

/** Build human-readable AI understanding for step 1 UI. */
export function buildIntakeUnderstanding(input: {
  intentGist: string | null;
  fieldMeta: Record<string, FieldState> | null;
  aiInvoked?: boolean;
}): IntakeUnderstandingView {
  const highlights: IntakeUnderstandingHighlight[] = [];
  const meta = input.fieldMeta ?? {};
  const order = [
    'categorySlug',
    'subcategorySlug',
    'transactionType',
    'city',
    'neighborhood',
    'budgetMax',
    'budgetMin',
    'rooms',
    'area',
  ] as const;

  const seen = new Set<string>();
  for (const key of order) {
    const row = highlightFromMeta(key, meta[key]);
    if (!row || seen.has(row.value)) continue;
    if (key === 'subcategorySlug' && highlights.some((h) => h.key === 'categorySlug')) {
      const cat = highlights.find((h) => h.key === 'categorySlug');
      if (cat && row.value.includes(cat.value.split(' / ').pop() ?? '')) continue;
    }
    seen.add(row.value);
    highlights.push(row);
  }

  const summary =
    input.intentGist?.trim() ||
    (highlights.length > 0
      ? `\u0628\u0647 \u0646\u0638\u0631 \u0645\u06CC\u200C\u0631\u0633\u062F ${highlights.map((h) => `${h.label}: ${h.value}`).join(' \u00B7 ')} \u0628\u0631\u0627\u06CC \u0634\u0645\u0627 \u0645\u0647\u0645 \u0627\u0633\u062A.`
      : '');

  return {
    summary,
    highlights,
    aiInvoked: Boolean(input.aiInvoked),
  };
}
