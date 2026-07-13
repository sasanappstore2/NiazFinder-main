import { embedModelId, embedPassage } from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import { isPublicBusinessProfile } from '@/lib/business/public-profile';
import { db } from '@/lib/db';
import { buildBusinessProfileSearchText } from '@/lib/rag/business-search-text';
import { hashRagContent } from '@/lib/rag/content-hash';

export async function clearBusinessEmbedding(profileId: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE "BusinessProfile"
     SET "searchText" = NULL,
         "searchEmbedding" = NULL,
         "embeddingModel" = NULL,
         "embeddedAt" = NULL,
         "embeddingContentHash" = NULL
     WHERE id = $1`,
    profileId,
  );
}

export async function embedBusinessProfileById(
  profileId: string,
): Promise<'embedded' | 'cleared' | 'skipped'> {
  const profile = await db.businessProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      province: true,
      address: true,
      categorySlugs: true,
      tags: true,
      status: true,
      embeddingContentHash: true,
      user: { select: { isActive: true } },
      offers: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        take: 12,
        select: { title: true },
      },
    },
  });

  if (!profile) return 'skipped';

  if (!isPublicBusinessProfile(profile)) {
    await clearBusinessEmbedding(profileId);
    return 'cleared';
  }

  const searchText = buildBusinessProfileSearchText({
    name: profile.name,
    description: profile.description,
    city: profile.city,
    province: profile.province,
    address: profile.address,
    categorySlugs: profile.categorySlugs,
    tags: profile.tags,
    offerTitles: profile.offers.map((o) => o.title),
  });
  const contentHash = hashRagContent(searchText);

  if (profile.embeddingContentHash === contentHash) {
    return 'skipped';
  }

  const vector = await embedPassage(searchText);
  const literal = pgvectorLiteral(vector);
  const now = new Date();

  await db.$executeRawUnsafe(
    `UPDATE "BusinessProfile"
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
    profileId,
  );

  return 'embedded';
}
