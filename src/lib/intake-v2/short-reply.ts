import type { NeedDraft } from '@/contracts/need-intake';
import type { V2Readiness } from '@/lib/intake-v2/v2-readiness';
import type { V2TurnPlan } from '@/lib/intake-v2/v2-question-driver';
import { isRealEstateIntent } from '@/lib/intake-v2/real-estate-guard';
import { isLocationConfirmed } from '@/lib/intake-v2/field-confirmation';
import { INTAKE_V2_OFF_TOPIC } from '@/lib/intake-v2/system-prompt';
import { getPlaybookQuestion } from '@/lib/intake-v2/v2-category-playbooks';
import { getCategoryPath } from '@/config/categories';
import { PROPERTY_DEAL_LABELS, PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';

function buildTurnAck(
  draft: NeedDraft,
  confirmedDelta: string[],
  userMessage: string
): string {
  if (confirmedDelta.length === 0) {
    if (/سلام|درود/.test(userMessage) && userMessage.length < 24) return '';
    if (userMessage.length > 4) return 'باشه. ';
    return '';
  }

  const parts: string[] = [];
  const { answers, parsedIntent } = draft;
  const confirmed = new Set(confirmedDelta);

  if (confirmedDelta.includes('propertyKind')) {
    const kind = answers.propertyKind ?? parsedIntent.entities?.propertyKind;
    if (kind && PROPERTY_KIND_LABELS[String(kind)]) {
      parts.push(PROPERTY_KIND_LABELS[String(kind)]);
    }
  }
  if (confirmedDelta.includes('dealType')) {
    const deal = answers.dealType ?? parsedIntent.entities?.dealType;
    if (deal && PROPERTY_DEAL_LABELS[String(deal)]) {
      parts.push(PROPERTY_DEAL_LABELS[String(deal)]);
    }
  }
  if (
    confirmedDelta.includes('location') &&
    isLocationConfirmed(draft, confirmed) &&
    draft.parsedIntent.locationResolutionStatus !== 'city_ambiguous'
  ) {
    const loc =
      answers.location ??
      (parsedIntent.entities?.area && parsedIntent.city
        ? `${parsedIntent.entities.area}، ${parsedIntent.city}`
        : parsedIntent.city);
    if (loc) parts.push(String(loc));
  }
  if (confirmedDelta.includes('floorMin') && answers.floorMin === 0) {
    parts.push('همکف');
  }
  if (confirmedDelta.includes('areaMin') && answers.areaMin) {
    parts.push(`${answers.areaMin} متر`);
  }
  if (confirmedDelta.includes('rooms') && answers.rooms) {
    parts.push(`${answers.rooms} خواب`);
  }
  if (confirmedDelta.includes('deposit') && answers.deposit) {
    parts.push('ودیعه');
  }
  if (confirmedDelta.includes('monthlyRent') && answers.monthlyRent) {
    parts.push('اجاره ماهانه');
  }

  if (parts.length === 0) {
    return userMessage.length > 4 ? 'باشه. ' : '';
  }
  return `${parts.slice(0, 3).join(' — ')} را ثبت کردم. `;
}

export function buildShortV2Reply(
  draft: NeedDraft,
  userMessage: string,
  readiness: V2Readiness,
  turnPlan: V2TurnPlan,
  opts?: {
    offTopic?: boolean;
    confirmedDelta?: string[];
    lastAskedField?: string | null;
  }
): string {
  if (opts?.offTopic) return INTAKE_V2_OFF_TOPIC;

  const delta = opts?.confirmedDelta ?? [];
  const ack = buildTurnAck(draft, delta, userMessage.trim());

  if (!isRealEstateIntent(draft.parsedIntent)) {
    return `${ack}نیاز ملکی‌تان را بگویید: خرید، فروش، اجاره یا رهن؟`;
  }

  if (readiness.readyToPreview) {
    return 'می‌توانید پیش‌نمایش آگهی را ببینید.';
  }

  if (turnPlan.disambiguation?.question) {
    return ack + turnPlan.disambiguation.question;
  }

  const fieldKey = turnPlan.activeFieldKey;
  if (!fieldKey) {
    return ack + 'یک جزئیات دیگر از نیاز ملکی‌تان را بگویید.';
  }

  if (
    opts?.lastAskedField === fieldKey &&
    delta.includes(fieldKey)
  ) {
    const nextMissing = readiness.missingFields.find((m) => m.key !== fieldKey);
    if (nextMissing) {
      return ack + getPlaybookQuestion(draft, nextMissing.key);
    }
  }

  return ack + getPlaybookQuestion(draft, fieldKey);
}

export function buildCategoryHeadline(draft: NeedDraft): string | null {
  const path = getCategoryPath(draft.parsedIntent.categorySlug);
  const leaf = path[path.length - 1]?.title;
  const city = draft.parsedIntent.city;
  if (leaf && city) return `${leaf} — ${city}`;
  return leaf ?? null;
}
