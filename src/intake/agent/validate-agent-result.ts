import type {
  IntakeAgentResult,
  IntakeAgentSuggestedQuestion,
  IntakeAgentWarning,
} from '@/intake/agent/types';
import { getCategoryBySlug } from '@/config/categories';
import { resolveFieldAction } from '@/intake/agent/confidence-policy';

const MONEY_MAX = 1e15;
const AREA_MIN = 5;
const AREA_MAX = 100_000;

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Validation layer: strip / flag hallucinated or incompatible values
 * without mutating the underlying NeedDraft (warnings only + soft clears on projection).
 */
export function validateAgentResult(result: IntakeAgentResult): IntakeAgentResult {
  const warnings: IntakeAgentWarning[] = [...result.warnings];
  let fields = [...result.fields];
  let suggestedQuestions: IntakeAgentSuggestedQuestion[] = [...result.suggestedQuestions];
  const categorySlug = result.categorySlug;
  const subcategorySlug = result.subcategorySlug;
  const categoryLabel = result.categoryLabel;

  const leaf = subcategorySlug || categorySlug;
  if (leaf) {
    const meta = getCategoryBySlug(leaf);
    if (!meta) {
      warnings.push({
        code: 'category_unknown',
        messageFa: 'دسته‌بندی استخراج‌شده در فهرست معتبر نیست',
        fieldKey: 'categorySlug',
      });
      fields = fields.map((f) =>
        f.key === 'categorySlug' || f.key === 'subcategorySlug'
          ? { ...f, action: 'ask' as const, confidence: Math.min(f.confidence, 0.4) }
          : f
      );
    }
  }

  const cityField = fields.find((f) => f.key === 'city');
  if (cityField && !result.location.citySlug && (cityField.confidence ?? 0) < 0.75) {
    warnings.push({
      code: 'city_unverified',
      messageFa: 'شهر نیاز به تایید دارد',
      fieldKey: 'city',
    });
    fields = fields.map((f) =>
      f.key === 'city' ? { ...f, action: 'confirm' as const } : f
    );
  }

  const hood = fields.find((f) => f.key === 'neighborhood');
  if (hood && !result.location.neighborhoodSlug) {
    warnings.push({
      code: 'neighborhood_unlinked',
      messageFa: 'محله به فهرست رسمی وصل نشده — لطفاً تایید یا اصلاح کنید',
      fieldKey: 'neighborhood',
    });
    fields = fields.map((f) =>
      f.key === 'neighborhood'
        ? { ...f, action: f.action === 'auto_accept' ? ('confirm' as const) : f.action }
        : f
    );
  }

  fields = fields.map((f) => {
    const n = asNumber(f.value);
    if (n == null) return f;
    if (
      ['budgetMax', 'budgetMin', 'rahnAmount', 'monthlyRent', 'deposit', 'budget'].includes(f.key) &&
      (n < 0 || n >= MONEY_MAX)
    ) {
      warnings.push({
        code: 'money_out_of_range',
        messageFa: `مبلغ «${f.label}» خارج از بازه معتبر است`,
        fieldKey: f.key,
      });
      return { ...f, action: 'ask' as const, confidence: 0, value: null, displayValue: '' };
    }
    if (f.key === 'area' && (n < AREA_MIN || n > AREA_MAX)) {
      warnings.push({
        code: 'area_out_of_range',
        messageFa: 'متراژ خارج از بازه معتبر است',
        fieldKey: 'area',
      });
      return { ...f, action: 'ask' as const, confidence: 0, value: null, displayValue: '' };
    }
    return { ...f, action: resolveFieldAction(f.confidence) };
  });

  const tx = String(fields.find((f) => f.key === 'transactionType')?.value ?? '');
  const rentish = /RENT|DEPOSIT|rahn|rent|اجاره|رهن/i.test(tx);
  const saleish = /BUY|SELL|buy|sell|خرید|فروش/i.test(tx) && !rentish;
  const hasMoney = fields.some((f) =>
    ['budgetMax', 'budgetMin', 'rahnAmount', 'monthlyRent', 'deposit'].includes(f.key) &&
    f.value != null &&
    f.value !== ''
  );
  const hasRahnOrRent = fields.some(
    (f) =>
      ['rahnAmount', 'monthlyRent', 'deposit'].includes(f.key) &&
      f.value != null &&
      f.value !== ''
  );

  if (rentish && !hasMoney) {
    const hasBudgetQ = suggestedQuestions.some((q) =>
      /budget|rahn|rent|deposit|بودجه|رهن|اجاره|ودیعه/i.test(q.fieldKey + q.questionFa)
    );
    if (!hasBudgetQ) {
      suggestedQuestions = [
        {
          fieldKey: hasRahnOrRent ? 'monthlyRent' : 'rahnAmount',
          questionFa: 'مبلغ رهن و اجاره حدوداً چقدر است؟',
          reason: 'missing',
        },
        ...suggestedQuestions,
      ];
    }
  }

  if (saleish && hasRahnOrRent) {
    warnings.push({
      code: 'deal_money_mismatch',
      messageFa: 'نوع معامله با فیلدهای رهن/اجاره سازگار نیست',
      fieldKey: 'transactionType',
    });
  }

  return {
    ...result,
    categorySlug,
    subcategorySlug,
    categoryLabel,
    fields: fields.filter((f) => f.displayValue || f.value != null),
    warnings,
    suggestedQuestions,
  };
}
