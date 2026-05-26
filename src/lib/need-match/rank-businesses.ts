import { z } from 'zod';
import type { MatchedBusinessItem, NeedMatchContext } from '@/contracts/need-match';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';
import { findCandidateBusinesses, toMatchedBusinessItems } from './candidate-query';

const rankSchema = z.object({
  matches: z.array(
    z.object({
      businessId: z.string(),
      score: z.number().min(0).max(1),
      reasonFa: z.string(),
    })
  ),
});

function buildRankSystemPrompt(): string {
  return `You rank local businesses for a Persian marketplace need.
Output ONLY JSON: { "matches": [{ "businessId": "...", "score": 0.0-1.0, "reasonFa": "..." }] }
- Only use businessId values from the candidate list.
- reasonFa: one short Persian sentence why this business fits the need.
- Higher score = better fit.`;
}

export async function matchBusinessesForNeed(
  need: NeedMatchContext,
  limit = 12
): Promise<{ businesses: MatchedBusinessItem[]; source: 'rules' | 'hybrid' | 'llm' }> {
  const candidates = await findCandidateBusinesses(need, 30);
  const ruleOrdered = toMatchedBusinessItems(candidates);

  if (!isNeedIntakeAiEnabled() || candidates.length === 0) {
    return { businesses: ruleOrdered.slice(0, limit), source: 'rules' };
  }

  try {
    const payload = {
      need: {
        title: need.title,
        description: need.description.slice(0, 800),
        category: need.categoryName,
        city: need.city,
        address: need.address,
        tags: need.tags,
      },
      candidates: candidates.map((c) => ({
        businessId: c.id,
        name: c.name,
        city: c.city,
        address: c.address,
        categories: c.categorySlugs,
        offer: c.topOfferTitle,
        description: c.description?.slice(0, 200),
      })),
    };

    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: buildRankSystemPrompt() },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      jsonMode: true,
      temperature: 0.2,
      timeoutMs: 15000,
    });

    const parsed = rankSchema.safeParse(extractJsonObject(content));
    if (!parsed.success) {
      return { businesses: ruleOrdered.slice(0, limit), source: 'rules' };
    }

    const byId = new Map(ruleOrdered.map((b) => [b.id, b]));
    const ranked: MatchedBusinessItem[] = [];

    for (const m of parsed.data.matches) {
      const base = byId.get(m.businessId);
      if (!base) continue;
      ranked.push({
        ...base,
        matchScore: m.score,
        matchReasonFa: m.reasonFa.slice(0, 200),
      });
      byId.delete(m.businessId);
    }

    for (const rest of byId.values()) {
      ranked.push(rest);
    }

    return { businesses: ranked.slice(0, limit), source: 'hybrid' };
  } catch (e) {
    console.warn('[need-match] LLM rank failed:', e instanceof Error ? e.message : e);
    return { businesses: ruleOrdered.slice(0, limit), source: 'rules' };
  }
}
