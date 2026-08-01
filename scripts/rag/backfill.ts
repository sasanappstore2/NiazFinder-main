/**
 * Backfill / process site-wide RAG indexes.
 * Usage:
 *   npm run rag:process
 *   npm run rag:embed:businesses
 *   npm run rag:embed:needs
 *   npm run rag:index:knowledge
 *   npm run rag:backfill
 */
import { PrismaClient } from '@prisma/client';
import {
  embedModelId,
  embedPassagesBatch,
  buildServiceRequestSearchText,
} from '../../src/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '../../src/lib/ai-agent/pgvector';
import { buildBusinessProfileSearchText } from '../../src/lib/rag/business-search-text';
import { hashRagContent } from '../../src/lib/rag/content-hash';
import { indexAllSiteKnowledge } from '../../src/lib/rag/knowledge-index';
import { processRagIndexJobs } from '../../src/lib/rag/processor';
import { enqueueRagIndexJob } from '../../src/lib/rag/queue';

const prisma = new PrismaClient();
const BATCH = Number(process.env.EMBED_BATCH_SIZE ?? 32);
const TARGET = process.argv[2] ?? 'all';

async function backfillBusinesses() {
  let updated = 0;
  for (;;) {
    const rows = await prisma.businessProfile.findMany({
      where: {
        status: 'ACTIVE',
        user: { isActive: true },
        OR: [{ embeddedAt: null }, { searchText: null }, { embeddingContentHash: null }],
      },
      take: Math.min(BATCH, 32),
      select: {
        id: true,
        name: true,
        description: true,
        city: true,
        province: true,
        address: true,
        categorySlugs: true,
        tags: true,
        offers: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          take: 12,
          select: { title: true },
        },
      },
    });
    if (rows.length === 0) break;

    const payloads = rows.map((r) => {
      const searchText = buildBusinessProfileSearchText({
        name: r.name,
        description: r.description,
        city: r.city,
        province: r.province,
        address: r.address,
        categorySlugs: r.categorySlugs,
        tags: r.tags,
        offerTitles: r.offers.map((o) => o.title),
      });
      return { id: r.id, searchText, contentHash: hashRagContent(searchText) };
    });

    const vectors = await embedPassagesBatch(payloads.map((p) => p.searchText));
    const model = embedModelId();
    const now = new Date();

    for (let i = 0; i < payloads.length; i++) {
      await prisma.$executeRawUnsafe(
        `UPDATE "BusinessProfile"
         SET "searchText" = $1,
             "searchEmbedding" = $2::vector,
             "embeddingModel" = $3,
             "embeddedAt" = $4,
             "embeddingContentHash" = $5
         WHERE id = $6`,
        payloads[i].searchText,
        pgvectorLiteral(vectors[i]),
        model,
        now,
        payloads[i].contentHash,
        payloads[i].id,
      );
      updated += 1;
    }
    console.log(`businesses embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function backfillNeeds() {
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
      await prisma.$executeRawUnsafe(
        `UPDATE "ServiceRequest"
         SET "searchText" = $1,
             "searchEmbedding" = $2::vector,
             "embeddingModel" = $3,
             "embeddedAt" = $4,
             "embeddingContentHash" = $5
         WHERE id = $6`,
        payloads[i].searchText,
        pgvectorLiteral(vectors[i]),
        model,
        now,
        payloads[i].contentHash,
        payloads[i].id,
      );
      updated += 1;
    }
    console.log(`needs embedded: +${rows.length} (total ${updated})`);
  }
  return updated;
}

async function enqueueAllPublicBusinesses() {
  const rows = await prisma.businessProfile.findMany({
    where: { status: 'ACTIVE', user: { isActive: true } },
    select: { id: true },
  });
  for (const row of rows) {
    await enqueueRagIndexJob({ sourceType: 'BUSINESS', sourceId: row.id });
  }
  return rows.length;
}

async function enqueueAllPublicNeeds() {
  const rows = await prisma.serviceRequest.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      moderationStatus: 'APPROVED',
      needAccessStatus: 'PUBLIC',
    },
    select: { id: true },
  });
  for (const row of rows) {
    await enqueueRagIndexJob({ sourceType: 'NEED', sourceId: row.id });
  }
  return rows.length;
}

async function main() {
  if (TARGET === 'process') {
    const result = await processRagIndexJobs({ limit: Number(process.env.RAG_PROCESS_LIMIT ?? 20) });
    console.log(result);
    return;
  }

  if (TARGET === 'knowledge' || TARGET === 'all') {
    const result = await indexAllSiteKnowledge();
    console.log('knowledge', result);
  }

  if (TARGET === 'businesses' || TARGET === 'all') {
    const n = await backfillBusinesses();
    console.log(`Done businesses: ${n}`);
  }

  if (TARGET === 'needs' || TARGET === 'all') {
    const n = await backfillNeeds();
    console.log(`Done needs: ${n}`);
  }

  if (TARGET === 'enqueue') {
    const b = await enqueueAllPublicBusinesses();
    const n = await enqueueAllPublicNeeds();
    console.log(`enqueued businesses=${b} needs=${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
