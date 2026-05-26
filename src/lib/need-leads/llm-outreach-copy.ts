import { z } from 'zod';
import type { NeedMatchContext } from '@/contracts/need-match';
import type { MatchedBusinessItem } from '@/contracts/need-match';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';

const copySchema = z.object({
  introFa: z.string(),
  highlightAddress: z.string().optional(),
});

export interface OutreachCopy {
  introFa: string;
  highlightAddress?: string;
}

function fallbackCopy(need: NeedMatchContext, businessName: string): OutreachCopy {
  const loc = [need.address, need.city, need.province].filter(Boolean).join('، ');
  const locPart = loc ? ` در ${loc}` : need.city ? ` در ${need.city}` : '';
  return {
    introFa: `سلام ${businessName}، یک نیاز جدید${locPart} با کسب‌وکار شما هم‌خوان است. جزئیات آگهی در کارت زیر است — در صورت تمایل پیشنهاد خود را ارسال کنید.`,
    highlightAddress: need.address ?? need.city ?? undefined,
  };
}

export async function generateOutreachCopy(
  need: NeedMatchContext,
  business: MatchedBusinessItem
): Promise<OutreachCopy> {
  if (!isNeedIntakeAiEnabled()) {
    return fallbackCopy(need, business.name);
  }

  try {
    const { content } = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: `Write a short friendly Persian intro message from "نیازفایندر AI" to a local business about a matching customer need.
Output ONLY JSON: { "introFa": "...", "highlightAddress": "..." }
- introFa: 2-3 sentences, mention area/address if relevant, invite them to view the need card below.
- highlightAddress: neighborhood or address snippet if applicable, else omit.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: business.name,
            need: {
              title: need.title,
              description: need.description.slice(0, 400),
              city: need.city,
              address: need.address,
              category: need.categoryName,
            },
            matchReason: business.matchReasonFa,
          }),
        },
      ],
      jsonMode: true,
      temperature: 0.4,
      timeoutMs: 10000,
    });

    const parsed = copySchema.safeParse(extractJsonObject(content));
    if (parsed.success && parsed.data.introFa.trim()) {
      return {
        introFa: parsed.data.introFa.trim().slice(0, 600),
        highlightAddress: parsed.data.highlightAddress?.trim(),
      };
    }
  } catch {
    /* fallback */
  }

  return fallbackCopy(need, business.name);
}
