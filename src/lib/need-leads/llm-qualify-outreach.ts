import { z } from 'zod';
import type { MatchedBusinessItem, NeedMatchContext } from '@/contracts/need-match';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';
import { db } from '@/lib/db';

const qualifySchema = z.object({
  approve: z.boolean(),
  score: z.number().min(0).max(1),
  reasonFa: z.string(),
});

export interface QualifiedLead extends MatchedBusinessItem {
  qualifyScore: number;
  qualifyReasonFa: string;
}

function buildQualifyPrompt(): string {
  return `You qualify whether a local business should receive a proactive lead alert for a customer need in Iran (Persian marketplace).
Output ONLY JSON: { "approve": boolean, "score": 0.0-1.0, "reasonFa": "..." }
- approve=true only if category, city/area, and service type clearly fit (e.g. real estate rent in Mashhad Imam St for a housing need in that area).
- reject if wrong city, wrong industry, or vague/generic match.
- reasonFa: one short Persian sentence.`;
}

async function loadBusinessDetails(businessId: string) {
  const p = await db.businessProfile.findUnique({
    where: { id: businessId },
    include: {
      offers: { where: { isPublished: true }, orderBy: { order: 'asc' }, take: 1 },
    },
  });
  if (!p) return null;
  let categorySlugs: string[] = [];
  try {
    categorySlugs = JSON.parse(p.categorySlugs || '[]');
  } catch {
    categorySlugs = [];
  }
  return {
    name: p.name,
    city: p.city,
    province: p.province,
    address: p.address,
    categorySlugs,
    description: p.description?.slice(0, 300),
    topOfferTitle: p.offers[0]?.title,
  };
}

/** LLM second-pass approval for top candidates (skipped when AI disabled). */
export async function qualifyLeadsWithLlm(
  need: NeedMatchContext,
  candidates: MatchedBusinessItem[]
): Promise<QualifiedLead[]> {
  if (!isNeedIntakeAiEnabled() || candidates.length === 0) {
    return candidates.map((c) => ({
      ...c,
      qualifyScore: c.matchScore,
      qualifyReasonFa: c.matchReasonFa,
    }));
  }

  const qualified: QualifiedLead[] = [];

  for (const c of candidates.slice(0, 15)) {
    const biz = await loadBusinessDetails(c.id);
    if (!biz) continue;

    try {
      const payload = {
        need: {
          title: need.title,
          description: need.description.slice(0, 600),
          city: need.city,
          province: need.province,
          address: need.address,
          category: need.categoryName,
          tags: need.tags,
          dynamicAnswers: need.dynamicAnswers,
        },
        business: biz,
      };

      const { content } = await chatCompletion({
        messages: [
          { role: 'system', content: buildQualifyPrompt() },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        jsonMode: true,
        temperature: 0.15,
        timeoutMs: 12000,
      });

      const parsed = qualifySchema.safeParse(extractJsonObject(content));
      if (!parsed.success || !parsed.data.approve) continue;

      qualified.push({
        ...c,
        matchScore: Math.max(c.matchScore, parsed.data.score),
        matchReasonFa: parsed.data.reasonFa.slice(0, 200) || c.matchReasonFa,
        qualifyScore: parsed.data.score,
        qualifyReasonFa: parsed.data.reasonFa.slice(0, 200),
      });
    } catch {
      if (c.matchScore >= 0.7) {
        qualified.push({
          ...c,
          qualifyScore: c.matchScore,
          qualifyReasonFa: c.matchReasonFa,
        });
      }
    }
  }

  return qualified.sort((a, b) => b.qualifyScore - a.qualifyScore);
}
