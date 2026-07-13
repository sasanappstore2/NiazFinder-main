import {
  buildServiceRequestSearchText,
  embedModelId,
  embedPassage,
} from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import { db } from '@/lib/db';
import { hashRagContent } from '@/lib/rag/content-hash';

const INDEXABLE_NEED = {
  status: { in: ['OPEN', 'IN_PROGRESS'] as const },
  moderationStatus: 'APPROVED' as const,
  needAccessStatus: 'PUBLIC' as const,
};

export async function clearNeedEmbedding(requestId: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE "ServiceRequest"
     SET "searchText" = NULL,
         "searchEmbedding" = NULL,
         "embeddingModel" = NULL,
         "embeddedAt" = NULL,
         "embeddingContentHash" = NULL
     WHERE id = $1`,
    requestId,
  );
}

export async function embedServiceRequestById(requestId: string): Promise<'embedded' | 'cleared' | 'skipped'> {
  const row = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      title: true,
      description: true,
      city: true,
      province: true,
      address: true,
      status: true,
      moderationStatus: true,
      needAccessStatus: true,
      embeddingContentHash: true,
      category: { select: { name: true } },
    },
  });

  if (!row) return 'skipped';

  const indexable =
    (row.status === 'OPEN' || row.status === 'IN_PROGRESS') &&
    row.moderationStatus === 'APPROVED' &&
    row.needAccessStatus === 'PUBLIC';

  if (!indexable) {
    await clearNeedEmbedding(requestId);
    return 'cleared';
  }

  const searchText = buildServiceRequestSearchText({
    title: row.title,
    description: row.description,
    city: row.city,
    province: row.province,
    address: row.address,
    categoryName: row.category.name,
  });
  const contentHash = hashRagContent(searchText);

  if (row.embeddingContentHash === contentHash) {
    return 'skipped';
  }

  const vector = await embedPassage(searchText);
  const literal = pgvectorLiteral(vector);
  const now = new Date();

  await db.$executeRawUnsafe(
    `UPDATE "ServiceRequest"
     SET "searchText" = $1,
         "searchEmbedding" = $2::vector,
         "embeddingModel" = $3,
         "embeddedAt" = $4,
         "embeddingContentHash" = $5
     WHERE id = $6`,
    searchText,
    literal,
    embedModelId(),
    now,
    contentHash,
    requestId,
  );

  return 'embedded';
}

export { INDEXABLE_NEED };
