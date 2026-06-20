import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassifierResult } from '../types/intent.types';

@Injectable()
export class LLMClassifierEngine {
  private readonly localLlmUrl = (
    process.env.NEED_INTAKE_LLM_URL ??
    process.env.AGENT_LLM_BASE_URL ??
    'http://127.0.0.1:1234'
  ).replace(/\/$/, '').replace(/\/v1$/, '');

  private readonly model =
    process.env.NEED_INTAKE_LLM_MODEL ??
    process.env.AGENT_LLM_MODEL ??
    'gemma-4-E2B_q4_0-it.gguf';

  constructor(private prisma: PrismaService) {}

  async classify(text: string): Promise<ClassifierResult> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    });

    if (categories.length === 0) return this.fallback();

    const categoryList = categories.map((c) => `${c.slug}|${c.name}`).join('\n');

    const systemPrompt =
      'You classify Iranian marketplace needs into exactly one category slug from the allowed list. Reply with JSON only.';

    const userPrompt = [
      'Allowed categories (format slug|name):',
      categoryList,
      `User need text: "${text}"`,
      'Reply with JSON only:',
      '{"category_id":"<slug from list>","confidence":0.0,"alternatives":[{"id":"<slug>","confidence":0.0}]}',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.localLlmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 256,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return this.fallback();

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as {
        category_id?: string;
        confidence?: number;
        alternatives?: Array<{ id?: string; confidence?: number }>;
      };

      const valid = categories.find((c) => c.slug === String(parsed.category_id));
      if (!valid) return this.fallback();

      return {
        source: 'llm',
        categoryId: valid.slug,
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        alternatives: (parsed.alternatives ?? [])
          .filter((a) => categories.some((c) => c.slug === String(a.id)))
          .map((a) => ({ id: String(a.id), confidence: Number(a.confidence) || 0 }))
          .slice(0, 3),
      };
    } catch {
      return this.fallback();
    }
  }

  private fallback(): ClassifierResult {
    return { source: 'llm', categoryId: '', confidence: 0, alternatives: [] };
  }
}
