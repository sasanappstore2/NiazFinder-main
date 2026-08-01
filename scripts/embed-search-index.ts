/**
 * Backfill Location and ServiceRequest embeddings for agent vector search.
 * Run: npm run embed:locations | npm run embed:service-needs | npm run embed:search-index
 *
 * Business + site-knowledge RAG: prefer `npm run rag:backfill` (scripts/rag/backfill.ts).
 * Per-record embed helpers live in src/lib/rag/*.
 */
import { PrismaClient } from '@prisma/client';
import {
  buildServiceRequestSearchText,
  embedModelId,
  embedPassagesBatch,
} from '../src/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '../src/lib/ai-agent/pgvector';
import { hashRagContent } from '../src/lib/rag/content-hash';

const prisma = new PrismaClient();

const BATCH = Number(process.env.EMBED_BATCH_SIZE ?? 64);
const TARGET = process.argv[2] ?? 'all';

async function backfillLocations() {
  let updated = 0;
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ id: string; semanticPath: string | null }>>`
      SELECT id, "semanticPath"
      FROM locations
      WHERE embedding IS NULL AND "semanticPath" IS NOT NULL
      LIMIT ${BATCH}
    `;
    if (rows.length === 0) break;

    const texts = rows.map((r) => r.semanticPath!);
    const vectors = await embedPassagesBatch(texts);
    const model = embedModelId();
    const now = new Date();

    for (let i = 0; i < rows.length; i++) {
      const literal = pgvectorLiteral(vectors[i]);
      await prisma.$executeRawUnsafe(
        `UPDATE locations SET embedding = $1::vector, "embeddingModel" = $2, "embeddedAt" = $3 WHERE id = $4`,
        literal,
        model,
        now,
        rows[i].id,
      );
      updated += 1;
    }
    console.log(`locations embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function backfillServiceRequests() {
  let updated = 0;
  for (;;) {
    const rows = await prisma.serviceRequest.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        moderationStatus: 'APPROVED',
        needAccessStatus: 'PUBLIC',
        OR: [{ embeddedAt: null }, { searchText: null }, { embeddingContentHash: null }],
      },
      take: Math.min(BATCH, 32),
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

    if (rows.length === 0) break;

    const payloads = rows.map((r) => {
      const searchText = buildServiceRequestSearchText({
        title: r.title,
        description: r.description,
        city: r.city,
        province: r.province,
        address: r.address,
        categoryName: r.category.name,
      });
      return { id: r.id, searchText, contentHash: hashRagContent(searchText) };
    });

    const vectors = await embedPassagesBatch(payloads.map((p) => p.searchText));
    const model = embedModelId();
    const now = new Date();

    for (let i = 0; i < payloads.length; i++) {
      const literal = pgvectorLiteral(vectors[i]);
      await prisma.$executeRawUnsafe(
        `UPDATE "ServiceRequest" SET "searchText" = $1, "searchEmbedding" = $2::vector, "embeddingModel" = $3, "embeddedAt" = $4, "embeddingContentHash" = $5 WHERE id = $6`,
        payloads[i].searchText,
        literal,
        model,
        now,
        payloads[i].contentHash,
        payloads[i].id,
      );
      updated += 1;
    }
    console.log(`service needs embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function main() {
  if (TARGET === 'locations' || TARGET === 'all') {
    const n = await backfillLocations();
    console.log(`Done locations: ${n}`);
  }
  if (TARGET === 'needs' || TARGET === 'service-needs' || TARGET === 'all') {
    const n = await backfillServiceRequests();
    console.log(`Done service needs: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
