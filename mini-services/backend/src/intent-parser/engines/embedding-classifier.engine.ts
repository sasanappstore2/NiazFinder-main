import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaClientService } from '../../common/http/ollama-client.service';
import { ClassifierResult } from '../types/intent.types';

interface CachedEmbedding {
  id: string;
  slug: string;
  name: string;
  vector: number[];
}

@Injectable()
export class EmbeddingClassifierEngine implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingClassifierEngine.name);
  private cache: CachedEmbedding[] = [];
  private readonly embedModel = process.env.EMBED_MODEL || 'nomic-embed-text';

  constructor(
    private prisma: PrismaService,
    private readonly ollama: OllamaClientService,
  ) {}

  async onModuleInit() {
    if (process.env.LOCAL_LLM_ONLY !== 'false') {
      this.logger.warn(
        'Embedding classifier disabled: LOCAL_LLM_ONLY uses chat-only GGUF gateway (no embeddings API).',
      );
      return;
    }
    await this.warmUp();
  }

  async classify(text: string): Promise<ClassifierResult> {
    if (this.cache.length === 0) {
      return { source: 'embedding', categoryId: '', confidence: 0, alternatives: [] };
    }

    const vector = await this.embed(text);
    if (!vector) return { source: 'embedding', categoryId: '', confidence: 0, alternatives: [] };

    const ranked = this.cache
      .map((cat) => ({ id: cat.slug, score: this.cosine(vector, cat.vector) }))
      .sort((a, b) => b.score - a.score);

    return {
      source: 'embedding',
      categoryId: ranked[0].id,
      confidence: ranked[0].score,
      alternatives: ranked.slice(1, 4).map((r) => ({ id: r.id, confidence: r.score })),
    };
  }

  private async warmUp() {
    try {
      const categories = await this.prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, embedding: true },
      });

      const needsEmbedding = categories.filter((c) => {
        const emb = c.embedding as number[] | null;
        return !emb || !Array.isArray(emb) || emb.length === 0;
      });

      if (needsEmbedding.length > 0) {
        this.logger.log(`Generating embeddings for ${needsEmbedding.length} categories...`);
        for (const cat of needsEmbedding) {
          const vector = await this.embed(cat.name);
          if (vector) {
            await this.prisma.category.update({
              where: { id: cat.id },
              data: { embedding: vector },
            });
            this.cache.push({ id: cat.id, slug: cat.slug, name: cat.name, vector });
          }
        }
      }

      for (const cat of categories) {
        const emb = cat.embedding as number[] | null;
        if (emb && Array.isArray(emb) && emb.length > 0) {
          if (!this.cache.some((c) => c.slug === cat.slug)) {
            this.cache.push({ id: cat.id, slug: cat.slug, name: cat.name, vector: emb });
          }
        }
      }

      this.logger.log(`Embedding cache ready: ${this.cache.length} categories`);
    } catch (e) {
      this.logger.warn(`Embedding warm-up failed, engine disabled: ${(e as Error).message}`);
    }
  }

  private async embed(text: string): Promise<number[] | null> {
    return this.ollama.embeddings(text, this.embedModel, 5000);
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
  }
}
