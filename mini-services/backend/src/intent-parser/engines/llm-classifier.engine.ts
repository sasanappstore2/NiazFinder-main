import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassifierResult } from '../types/intent.types';

@Injectable()
export class LLMClassifierEngine {
  private readonly ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private readonly model = process.env.NLP_MODEL || 'qwen2:1.5b';

  constructor(private prisma: PrismaService) {}

  async classify(text: string): Promise<ClassifierResult> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    });

    if (categories.length === 0) return this.fallback();

    const categoryList = categories.map((c) => `${c.slug}|${c.name}`).join('\n');

    const prompt = [
      'You classify Iranian marketplace needs into exactly one category slug from the list below.',
      'Allowed categories (format slug|name):',
      categoryList,
      `User need text: "${text}"`,
      'Reply with JSON only:',
      '{"category_id":"<slug from list>","confidence":0.0,"alternatives":[{"id":"<slug>","confidence":0.0}]}',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.1, top_p: 0.9 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return this.fallback();

      const data = (await response.json()) as { response?: string };
      const parsed = JSON.parse(data.response ?? '{}') as {
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
