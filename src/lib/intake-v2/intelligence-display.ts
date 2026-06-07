import type {
  NeedFinancialStatus,
  NeedIntelligenceArea,
  NeedIntelligenceBudget,
  NeedIntelligenceLocation,
  NeedIntelligenceProfile,
  NeedMotivation,
  NeedUrgency,
} from '@/contracts/need-intelligence';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';
import { toPersianDigits } from '@/lib/format/digits';

const URGENCY_LABELS: Record<NeedUrgency, string> = {
  LOW: 'بدون عجله',
  NORMAL: 'معمولی',
  HIGH: 'نسبتاً فوری',
  URGENT: 'فوری',
};

const MOTIVATION_LABELS: Record<NeedMotivation, string> = {
  investment: 'سرمایه‌گذاری',
  residence: 'سکونت',
  business: 'کسب‌وکار',
  migration: 'مهاجرت',
  preservation: 'حفظ سرمایه',
  forced: 'اجباری / فوری',
};

const FINANCIAL_STATUS_LABELS: Record<NeedFinancialStatus, string> = {
  cash: 'نقد',
  loan: 'وام',
  mixed: 'ترکیبی',
  needs_sale: 'نیاز به فروش ملک قبلی',
};

function formatLocation(loc: NeedIntelligenceLocation): string | null {
  const parts: string[] = [];
  if (loc.neighborhood?.trim()) parts.push(loc.neighborhood.trim());
  if (loc.district?.trim() && loc.district !== loc.neighborhood) {
    parts.push(loc.district.trim());
  }
  if (loc.city?.trim()) parts.push(loc.city.trim());
  if (loc.radiusKm != null) {
    parts.push(`شعاع ${toPersianDigits(String(loc.radiusKm))} کیلومتر`);
  }
  return parts.length ? parts.join('، ') : null;
}

function formatBudget(budget: NeedIntelligenceBudget): string | null {
  const parts: string[] = [];
  if (budget.min != null) {
    parts.push(`از ${formatMoneyToman(budget.min)} تومان`);
  }
  if (budget.max != null) {
    parts.push(`تا ${formatMoneyToman(budget.max)} تومان`);
  }
  if (budget.flexible) parts.push('انعطاف‌پذیر');
  return parts.length ? parts.join(' ') : null;
}

function formatArea(area: NeedIntelligenceArea): string | null {
  const parts: string[] = [];
  if (area.min != null) {
    parts.push(`حداقل ${toPersianDigits(String(area.min))} متر`);
  }
  if (area.max != null) {
    parts.push(`حداکثر ${toPersianDigits(String(area.max))} متر`);
  }
  if (area.approximate) parts.push('حدودی');
  return parts.length ? parts.join(' · ') : null;
}

function labelDealType(raw: string): string {
  return PROPERTY_DEAL_LABELS[raw] ?? PROPERTY_KIND_LABELS[raw] ?? raw;
}

/** Human-readable Persian rows for the intelligence sidebar. */
export function formatIntelligenceRows(
  profile?: NeedIntelligenceProfile
): Array<{ section: 'core' | 'decision' | 'smart'; label: string; value: string }> {
  if (!profile) return [];
  const rows: Array<{ section: 'core' | 'decision' | 'smart'; label: string; value: string }> =
    [];

  if (profile.transaction) {
    rows.push({
      section: 'core',
      label: 'نوع معامله',
      value: labelDealType(profile.transaction),
    });
  }
  if (profile.propertyType) {
    rows.push({
      section: 'core',
      label: 'نوع ملک',
      value: profile.propertyType,
    });
  }
  if (profile.location) {
    const loc = formatLocation(profile.location);
    if (loc) rows.push({ section: 'core', label: 'مکان', value: loc });
  }
  if (profile.budget) {
    const b = formatBudget(profile.budget);
    if (b) rows.push({ section: 'core', label: 'بودجه', value: b });
  }
  if (profile.area) {
    const a = formatArea(profile.area);
    if (a) rows.push({ section: 'core', label: 'متراژ', value: a });
  }

  if (profile.urgency) {
    rows.push({
      section: 'decision',
      label: 'فوریت',
      value: URGENCY_LABELS[profile.urgency] ?? profile.urgency,
    });
  }
  if (profile.motivation) {
    rows.push({
      section: 'decision',
      label: 'انگیزه',
      value: MOTIVATION_LABELS[profile.motivation] ?? profile.motivation,
    });
  }
  if (profile.intentScore != null) {
    rows.push({
      section: 'decision',
      label: 'امتیاز قصد',
      value: toPersianDigits(String(Math.round(profile.intentScore * 100))) + '٪',
    });
  }
  if (profile.financialStatus) {
    rows.push({
      section: 'decision',
      label: 'وضعیت مالی',
      value: FINANCIAL_STATUS_LABELS[profile.financialStatus] ?? profile.financialStatus,
    });
  }

  if (profile.mustHave?.length) {
    rows.push({ section: 'smart', label: 'الزامی', value: profile.mustHave.join('، ') });
  }
  if (profile.niceToHave?.length) {
    rows.push({ section: 'smart', label: 'ترجیحی', value: profile.niceToHave.join('، ') });
  }
  if (profile.priorities?.length) {
    rows.push({ section: 'smart', label: 'اولویت‌ها', value: profile.priorities.join('، ') });
  }
  if (profile.lifestyleSignals?.length) {
    rows.push({
      section: 'smart',
      label: 'سبک زندگی',
      value: profile.lifestyleSignals.join('، '),
    });
  }
  if (profile.locationPreferences?.length) {
    rows.push({
      section: 'smart',
      label: 'ترجیحات مکان',
      value: profile.locationPreferences.join('، '),
    });
  }

  return rows;
}
