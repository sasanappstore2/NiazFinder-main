-- Site-wide platform agent RAG: business vectors, knowledge chunks, durable index jobs

-- AlterTable ServiceRequest
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "embeddingContentHash" TEXT;

-- AlterTable BusinessProfile
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "searchText" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "searchEmbedding" vector(384);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMP(3);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "embeddingContentHash" TEXT;

CREATE INDEX IF NOT EXISTS "BusinessProfile_search_embedding_hnsw_idx"
  ON "BusinessProfile" USING hnsw ("searchEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RagIndexSourceType" AS ENUM ('BUSINESS', 'NEED', 'SITE_KNOWLEDGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RagIndexOperation" AS ENUM ('UPSERT', 'DELETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RagIndexJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable site_knowledge_chunks
CREATE TABLE IF NOT EXISTS "site_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "section" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "route" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "site_knowledge_chunks_sourceKey_contentHash_chunkIndex_key"
  ON "site_knowledge_chunks"("sourceKey", "contentHash", "chunkIndex");

CREATE INDEX IF NOT EXISTS "site_knowledge_chunks_sourceKey_idx"
  ON "site_knowledge_chunks"("sourceKey");

CREATE INDEX IF NOT EXISTS "site_knowledge_chunks_isPublic_idx"
  ON "site_knowledge_chunks"("isPublic");

CREATE INDEX IF NOT EXISTS "site_knowledge_chunks_route_idx"
  ON "site_knowledge_chunks"("route");

CREATE INDEX IF NOT EXISTS "site_knowledge_chunks_public_embedding_hnsw_idx"
  ON "site_knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "isPublic" = true AND "embedding" IS NOT NULL;

-- CreateTable rag_index_jobs
CREATE TABLE IF NOT EXISTS "rag_index_jobs" (
    "id" TEXT NOT NULL,
    "sourceType" "RagIndexSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "operation" "RagIndexOperation" NOT NULL DEFAULT 'UPSERT',
    "status" "RagIndexJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_index_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rag_index_jobs_status_availableAt_idx"
  ON "rag_index_jobs"("status", "availableAt");

CREATE INDEX IF NOT EXISTS "rag_index_jobs_sourceType_sourceId_idx"
  ON "rag_index_jobs"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "rag_index_jobs_lockedAt_idx"
  ON "rag_index_jobs"("lockedAt");
