import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_EMBED_URL = 'http://127.0.0.1:8102';
const DEFAULT_EMBED_MODEL = 'multilingual-e5-small';

@Injectable()
export class LocationEmbeddingService {
  private readonly logger = new Logger(LocationEmbeddingService.name);

  constructor(private readonly prisma: PrismaService) {}

  embedLlmUrl(): string {
    return (process.env.EMBED_LLM_URL ?? DEFAULT_EMBED_URL).replace(/\/$/, '');
  }

  embedModelId(): string {
    return process.env.EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
  }

  pgvectorLiteral(vec: number[]): string {
    return `[${vec.map((v) => (Number.isFinite(v) ? v : 0)).join(',')}]`;
  }

  buildServiceRequestSearchText(row: {
    title: string;
    description: string;
    city?: string | null;
    province?: string | null;
    address?: string | null;
    categoryName?: string | null;
  }): string {
    return [
      row.title,
      row.description,
      row.categoryName ?? '',
      [row.city, row.province, row.address].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.embedLlmUrl()}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embedModelId(),
        input: texts.length === 1 ? texts[0] : texts,
      }),
      signal: AbortSignal.timeout(Number(process.env.EMBED_TIMEOUT_MS ?? 30_000)),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Embedding API error ${res.status}: ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vectors = (json.data ?? []).map((d) => d.embedding ?? []);
    if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
      throw new Error('Embedding API returned invalid vectors');
    }
    return vectors;
  }

  async embedPassage(text: string): Promise<number[]> {
    const [vec] = await this.fetchEmbeddings([`passage: ${text}`]);
    return vec;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vec] = await this.fetchEmbeddings([`query: ${text}`]);
    return vec;
  }

  async embedPassagesBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.fetchEmbeddings(texts.map((t) => `passage: ${t}`));
  }

  async backfillLocations(batchSize = 64): Promise<{ updated: number }> {
    let updated = 0;
    const rows = await this.prisma.$queryRaw<Array<{ id: string; semanticPath: string | null }>>`
      SELECT id, "semanticPath"
      FROM locations
      WHERE embedding IS NULL AND "semanticPath" IS NOT NULL
      LIMIT ${batchSize}
    `;
    if (rows.length === 0) return { updated: 0 };

    const vectors = await this.embedPassagesBatch(rows.map((r) => r.semanticPath!));
    const model = this.embedModelId();
    const now = new Date();

    for (let i = 0; i < rows.length; i++) {
      const literal = this.pgvectorLiteral(vectors[i]);
      await this.prisma.$executeRawUnsafe(
        `UPDATE locations SET embedding = $1::vector, "embeddingModel" = $2, "embeddedAt" = $3 WHERE id = $4`,
        literal,
        model,
        now,
        rows[i].id,
      );
      updated += 1;
    }
    return { updated };
  }

  async backfillServiceRequests(batchSize = 32): Promise<{ updated: number }> {
    let updated = 0;
    const rows = await this.prisma.serviceRequest.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        moderationStatus: 'APPROVED',
        needAccessStatus: 'PUBLIC',
        OR: [{ embeddedAt: null }, { searchText: null }],
      },
      take: batchSize,
      select: {
        id: true,
        title: true,
        description: true,
        city: true,
        province: true,
        address: true,
        category: { select: { name: true } },
      },
    });
    if (rows.length === 0) return { updated: 0 };

    const payloads = rows.map((r) => ({
      id: r.id,
      searchText: this.buildServiceRequestSearchText({
        title: r.title,
        description: r.description,
        city: r.city,
        province: r.province,
        address: r.address,
        categoryName: r.category.name,
      }),
    }));

    const vectors = await this.embedPassagesBatch(payloads.map((p) => p.searchText));
    const model = this.embedModelId();
    const now = new Date();

    for (let i = 0; i < payloads.length; i++) {
      const literal = this.pgvectorLiteral(vectors[i]);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "ServiceRequest" SET "searchText" = $1, "searchEmbedding" = $2::vector, "embeddingModel" = $3, "embeddedAt" = $4 WHERE id = $5`,
        payloads[i].searchText,
        literal,
        model,
        now,
        payloads[i].id,
      );
      updated += 1;
    }
    return { updated };
  }
}
