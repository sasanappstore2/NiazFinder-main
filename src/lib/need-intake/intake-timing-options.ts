/** Intake UI options for need urgency / deadline. */

const L_TODAY = '\u0627\u0645\u0631\u0648\u0632 / \u0641\u0648\u0631\u06CC';
const L_WEEK = '\u062A\u0627 \u06CC\u06A9 \u0647\u0641\u062A\u0647';
const L_MONTH = '\u062A\u0627 \u06CC\u06A9 \u0645\u0627\u0647';
const L_FLEX = '\u0627\u0646\u0639\u0637\u0627\u0641\u200c\u067E\u0630\u06CC\u0631';
const L_LOW = '\u0639\u0627\u062F\u06CC';
const L_NORMAL = '\u0645\u062A\u0648\u0633\u0637';
const L_HIGH = '\u0645\u0647\u0645';
const L_URGENT = '\u0641\u0648\u0631\u06CC';
const L_UNKNOWN = '\u0646\u0627\u0645\u0634\u062E\u0635';
const L_DAY = '\u0631\u0648\u0632';

export const INTAKE_WHEN_OPTIONS = [
  { value: 'today', label: L_TODAY },
  { value: 'week', label: L_WEEK },
  { value: 'month', label: L_MONTH },
  { value: 'flexible', label: L_FLEX },
] as const;

export const INTAKE_URGENCY_OPTIONS = [
  { value: 'LOW', label: L_LOW },
  { value: 'NORMAL', label: L_NORMAL },
  { value: 'HIGH', label: L_HIGH },
  { value: 'URGENT', label: L_URGENT },
] as const;

export type IntakeWhenValue = (typeof INTAKE_WHEN_OPTIONS)[number]['value'];

export function whenToDeliveryDays(when: string | undefined | null): number | undefined {
  switch (String(when ?? '').trim()) {
    case 'today':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'flexible':
      return 60;
    default:
      return undefined;
  }
}

export function whenToUrgency(
  when: string | undefined | null
): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | undefined {
  switch (String(when ?? '').trim()) {
    case 'today':
      return 'URGENT';
    case 'week':
      return 'HIGH';
    case 'month':
      return 'NORMAL';
    case 'flexible':
      return 'LOW';
    default:
      return undefined;
  }
}

export function formatWhenLabel(when: string | undefined | null): string | null {
  const hit = INTAKE_WHEN_OPTIONS.find((o) => o.value === String(when ?? '').trim());
  return hit?.label ?? null;
}

export function formatUrgencyLabel(urgency: string | undefined | null): string | null {
  const hit = INTAKE_URGENCY_OPTIONS.find((o) => o.value === String(urgency ?? '').trim());
  return hit?.label ?? null;
}

export function formatDeliveryDeadlineLabel(opts: {
  deliveryTime?: number | null;
  when?: string | null;
  urgency?: string | null;
  priority?: string | null;
}): string {
  if (opts.deliveryTime != null && Number.isFinite(opts.deliveryTime) && opts.deliveryTime > 0) {
    return `${opts.deliveryTime.toLocaleString('fa-IR')} ${L_DAY}`;
  }
  const whenLabel = formatWhenLabel(opts.when);
  if (whenLabel) return whenLabel;
  const urgencyLabel = formatUrgencyLabel(opts.urgency);
  if (urgencyLabel) return urgencyLabel;
  if (opts.priority === 'URGENT') return L_URGENT;
  if (opts.priority === 'HIGH') return L_HIGH;
  return L_UNKNOWN;
}
