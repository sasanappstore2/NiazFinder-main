import type { NeedMatchContext } from '@/contracts/need-match';
import type { MatchedBusinessItem } from '@/contracts/need-match';

export interface OutreachCopy {
  introFa: string;
  highlightAddress?: string;
}

/** Fixed Persian outreach intro — no LLM. */
export function generateOutreachCopy(
  need: NeedMatchContext,
  business: MatchedBusinessItem
): OutreachCopy {
  const loc = [need.address, need.city, need.province].filter(Boolean).join('، ');
  const locPart = loc ? ` در ${loc}` : need.city ? ` در ${need.city}` : '';
  const reason = business.matchReasonFa
    ? ` (${business.matchReasonFa})`
    : '';

  return {
    introFa: `سلام ${business.name}، یک نیاز جدید${locPart} با کسب‌وکار شما هم‌خوان است${reason}. جزئیات آگهی در کارت زیر است — در صورت تمایل پیشنهاد خود را ارسال کنید.`,
    highlightAddress: need.address ?? need.city ?? undefined,
  };
}
